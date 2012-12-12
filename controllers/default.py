# -*- coding: utf-8 -*-
# this file is released under public domain and you can use without limitations

#########################################################################
## This is a samples controller
## - index is the default action of any application
## - user is required for authentication and authorization
## - download is for downloading files uploaded in the db (does streaming)
## - call exposes all registered services (none by default)
#########################################################################


def index():
    """
    example action using the internationalization operator T and flash
    rendered by views/default/index.html or views/generic.html

    if you need a simple wiki simple replace the two lines below with:
    return auth.wiki()
    """

    return {
        'songs': db(db.songs).select(
            db.songs.id, db.songs.name,
            orderby=db.songs.upvotes, limitby=(0, 5)),
        'instruments': db(db.instruments).select(
            db.instruments.id, db.instruments.name,
            orderby=db.instruments.upvotes, limitby=(0, 5))
        }


def user():
    """
    exposes:
    http://..../[app]/default/user/login
    http://..../[app]/default/user/logout
    http://..../[app]/default/user/register
    http://..../[app]/default/user/profile
    http://..../[app]/default/user/retrieve_password
    http://..../[app]/default/user/change_password
    use @auth.requires_login()
        @auth.requires_membership('group name')
        @auth.requires_permission('read','table name',record_id)
    to decorate functions that need access control
    """
    def profile_validate(form):
        import cgi
        if isinstance(request.vars.avatar, cgi.FieldStorage):

            # For some reason, passing the result of db.images.image.store or
            # just request.vars.avatar.file into validate_and_insert is causing
            # the validation to fail (I think because store returns a string,
            # and IS_IMAGE expects an object with .file and .filename
            # attributes) but passing the request.vars.avatar object in doesn't
            # cause the file to be stored, and causes a junk name to be in the
            # database, so I call the validator and store manually. I tried
            # making a bug report of this, but couldn't reproduce it in a test
            # case. *head scratch* *fix later*

            logger.info('validator {}'.format(db.images.image.requires))
            valid = db.images.image.requires(request.vars.avatar)
            if valid[1]:
                form.errors.avatar = 'Invalid image'
                return

            result = db.images.insert(
                image=request.vars.avatar.file,
                name=request.vars.avatar.filename,
                user=auth.user_id)

            if not result.errors:
                db(db.auth_user.id == auth.user_id).update(avatar=result.id)
            else:
                form.errors.avatar = 'Database error'

    auth.settings.register_fields = ['username', 'email', 'password']
    auth.settings.profile_fields = ['email', 'bio']
    auth.settings.profile_next = URL('default', 'profile', args=[auth.user_id])
    auth.settings.profile_onvalidation = profile_validate

    form=auth()

    if request.args(0) == 'profile':
        avatar_error = DIV(
            DIV(form.errors.avatar, _class='error'),
            _class='error_wrapper')

        avatar_field = TR(
            LABEL('Avatar'),
            DIV(INPUT(_name='avatar', _type='file'),
                avatar_error if form.errors.avatar else ''),
            'A JPEG or PNG image. Must be 100x100 or less.')
        form[0].insert(-1, avatar_field)

    return dict(form=form)

def profile():
    return_data = {}

    if len(request.args) == 1:
        user_id = request.args[0]
        row = (db((db.auth_user.id == user_id)
                  & (db.auth_user.avatar == db.images.id))
               .select(db.auth_user.id, db.auth_user.username,
                       db.auth_user.bio, db.images.image)
               .first())
        if not row:
            raise HTTP(404)

        return_data['user'] = row
        
    else:
        raise HTTP(404)

    return_data.update(browse_page({
                'songs': db.songs.author == user_id,
                'instruments': db.instruments.author == user_id
                }))

    return return_data

def news():
    return {}

def download():
    """
    allows downloading of uploaded files
    http://..../[app]/default/download/[filename]
    """
    return response.download(request, db)


def call():
    """
    exposes services. for example:
    http://..../[app]/default/call/jsonrpc
    decorate with @services.jsonrpc the functions to expose
    supports xml, json, xmlrpc, jsonrpc, amfrpc, rss, csv
    """
    return service()


@auth.requires_signature()
def data():
    """
    http://..../[app]/default/data/tables
    http://..../[app]/default/data/create/[table]
    http://..../[app]/default/data/read/[table]/[id]
    http://..../[app]/default/data/update/[table]/[id]
    http://..../[app]/default/data/delete/[table]/[id]
    http://..../[app]/default/data/select/[table]
    http://..../[app]/default/data/search/[table]
    but URLs must be signed, i.e. linked with
      A('table',_href=URL('data/tables',user_signature=True))
    or with the signed load operator
      LOAD('default','data.load',args='tables',ajax=True,user_signature=True)
    """
    return dict(form=crud())
