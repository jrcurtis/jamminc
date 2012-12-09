
def index():
    return_data =  {}

    return_data.update(browse_page({
                'songs': db.songs.author == auth.user_id,
                'instruments': db.instruments.author == auth.user_id
                }))

    return return_data

def edit():
    return_data = {
        'song_id': '',
        'inst_id': '',
        }

    if len(request.args) == 0:
        redirect(URL('music', 'edit', args=['song']))

    elif len(request.args) == 1:
        if request.args[0] == 'songs':
            return_data['song_id'] = 'new'
        elif request.args[0] == 'instruments':
            return_data['inst_id'] = 'new'
        else:
            raise HTTP(404)

    elif len(request.args) == 2:
        if request.args[0] == 'songs':
            return_data['song_id'] = request.args[1]
        elif request.args[0] == 'instruments':
            return_data['inst_id'] = request.args[1]
        else:
            raise HTTP(404)

    else:
        raise HTTP(404)

    return return_data

def browse():
    return_data = {}
    items = {
        'songs': db.songs.id > 0,
        'instruments': db.instruments.id > 0
        }

    if len(request.args) == 1:
        if request.args[0] == 'songs':
            del items['instruments']
        elif request.args[0] == 'instruments':
            del items['songs']
        else:
            raise HTTP(404)
    elif len(request.args) > 1:
        raise HTTP(404)

    return_data.update(browse_page(items))

    return return_data

def view():
    return_data = {}

    song = instrument = None

    logger.info('view args {}'.format(request.args))
    if len(request.args) != 2:
        raise HTTP(404)

    if request.args[0] == 'instruments':
        row = (
            db((db.instruments.id == request.args[1])
               & (db.instruments.image == db.images.id)
               & (db.instruments.author == db.auth_user.id))
            .select(db.instruments.id, db.instruments.name,
                    db.instruments.description,
                    db.instruments.author, db.instruments.created,
                    db.images.image,
                    db.auth_user.id, db.auth_user.username)
            .first())

        if not row:
            raise HTTP(404)

        instrument = row.instruments

        return_data['browse_data'] = {}

        db.comments.instrument.default = row.instruments.id

    elif request.args[0] == 'songs':
        row = (
            db((db.songs.id == request.args[1])
               & (db.songs.image == db.images.id)
               & (db.songs.author == db.auth_user.id))
            .select(db.songs.id, db.songs.name, db.songs.author,
                    db.songs.description, db.songs.created,
                    db.images.image,
                    db.auth_user.id, db.auth_user.username)
            .first())

        if not row:
            raise HTTP(404)

        song = row.songs

        return_data.update(browse_page({
                    'tracks': db.tracks.song == row.songs.id,
                    'instruments': (
                        (db.tracks.song == row.songs.id)
                        & (db.tracks.instrument == db.instruments.id))
                    }))

        db.comments.song.default = row.songs.id

    else:
        raise HTTP(404)

    if auth.user:
        crud.messages.record_created = 'Comment posted'
        comment_form = crud.create(db.comments)
    else:
        comment_form = 'Log in to comment.'

    comments_query = (((db.comments.song if song else db.comments.instrument)
                       == (song.id if song else instrument.id))
                      & (db.comments.author == db.auth_user.id))
    return_data['comments'] = (
        db(comments_query)
        .select(db.comments.text, db.comments.created,
                db.auth_user.id, db.auth_user.username))


    return_data['song'] = song
    return_data['instrument'] = instrument
    return_data['author'] = row.auth_user
    return_data['image'] = row.images.image
    return_data['comment_form'] = comment_form

    return return_data

@request.restful()
def instruments():
    def GET(id):
        return_data = {}

        inst = db.instruments[id]

        if inst is not None:
            return_data['name'] = inst.name
            return_data['data'] = inst.data
        else:
            return_data['error'] = 'No such instrument'

        return return_data

    def POST(name, data):
        return_data = {}

        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            result = db.instruments.validate_and_insert(
                name=name, data=data, author=auth.user_id)

            if result.errors:
                return_data['error'] = 'Database error'
                logger.info("Database error on instrument create: {}"
                            .format(result.errors))
            else:
                db.commit()
                return_data['id'] = result.id

        return return_data

    def PUT(id, name, data):
        return_data = {}

        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            inst_query = ((db.instruments.id == id)
                          & (db.instruments.author == auth.user_id))
            result = db(inst_query).validate_and_update(name=name, data=data)

            if result.errors:
                return_data['error'] = 'Database error'
                logger.info("Database error on instrument update: {}"
                            .format(result.errors))
            else:
                db.commit()

        return return_data

    def DELETE(id):
        return_data = {}
        
        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            inst_query = ((db.instruments.id == id)
                          & (db.instruments.author == auth.user_id))
            db(inst_query).delete()
            db.commit()

        return return_data

    return locals()

@request.restful()
def instruments_list():
    def GET():
        if auth.user:
            instruments_query = db.instruments.author == auth.user_id
            favorites_query = (
                (db.favorite_instruments.user == auth.user_id)
                & (db.favorite_instruments.instrument == db.instruments.id))
        else:
            instruments_query = db.instruments.author == 1

        instruments = db(instruments_query).select(
            db.instruments.id, db.instruments.name).as_list()

        return {
            'instruments': map(lambda r: [r['name'], r['id']], instruments)
            }

    return locals()

@request.restful()
def tracks():
    def GET(id):
        return_data = {}

        track = db.tracks[id]

        if track is not None:
            return_data['name'] = track.name
            return_data['data'] = track.data
        else:
            return_data['error'] = 'No such track'

        return return_data

    def POST(song_id, name, data, inst_id=0):
        return_data = {}

        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            result = db.tracks.validate_and_insert(
                song=song_id, name=name, data=data, instrument=inst_id,
                author=auth.user_id)

            if result.errors:
                return_data['error'] = 'Database error'
                logger.info("Database error on track create: {}"
                            .format(result.errors))
            else:
                db.commit()
                return_data['id'] = result.id

        return return_data

    def PUT(id, name, data, inst_id=0):
        return_data = {}

        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            track_query = ((db.tracks.id == id)
                           & (db.tracks.author == auth.user_id))
            result = db(track_query).validate_and_update(
                name=name, data=data, instrument=inst_id)

            if result.errors:
                return_data['error'] = 'Database error'
                logger.info("Database error on track update: {}"
                            .format(result.errors))
            else:
                db.commit()

        return return_data

    def DELETE(id):
        return_data = {}
        
        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            track_query = ((db.tracks.id == id)
                           & (db.tracks.author == auth.user_id))
            db(track_query).delete()
            db.commit()

        return return_data

    return locals()

@request.restful()
def songs():
    def GET(id):
        return_data = {}

        song = db.songs[id]

        if song is not None:
            return_data['name'] = song.name
            tracks_query = db.tracks.song == id
            tracks = db(tracks_query).select(db.tracks.id)
            return_data['tracks'] = map(lambda r: r['id'], tracks.as_list())
        else:
            return_data['error'] = 'No such song'

        return return_data

    def POST(name):
        return_data = {}

        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            result = db.songs.validate_and_insert(
                name=name, author=auth.user_id)

            if result.errors:
                return_data['error'] = 'Database error'
                logger.info("Database error on song create: {}"
                            .format(result.errors))
            else:
                db.commit()
                return_data['id'] = result.id

        return return_data

    def PUT(id, name):
        return_data = {}

        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            song_query = ((db.songs.id == id)
                          & (db.songs.author == auth.user_id))
            result = db(song_query).validate_and_update(name=name)

            if result.errors:
                return_data['error'] = 'Database error'
                logger.info("Database error on song update: {}"
                            .format(result.errors))
            else:
                db.commit()

        return return_data

    def DELETE(id):
        return_data = {}
        
        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            song_query = ((db.songs.id == id)
                          & (db.songs.author == auth.user_id))
            db(song_query).delete()
            db.commit()

        return return_data

    return locals()

def description():
    if not auth.user:
        return { 'error': 'Must be logged in' }

    if request.vars.song_id:
        table = db.songs
        id = request.vars.song_id
    elif request.vars.inst_id:
        table = db.instruments
        id = request.vars.inst_id
    else:
        raise HTTP(400)

    form = SQLFORM(table, table[id], fields=['description'], showid=False)
 
    if form.process().accepted:
        return {}
    elif form.errors:
        return { 'form': form, 'error': 'Form has errors' }
    else:
        return { 'form': form }

def image():
    if not auth.user:
        return { 'error': 'Must be logged in' }

    form = SQLFORM(
        db.images,
        col3={ 'image': 'A JPEG or PNG image. Must be 100x100 or less.'})
    form.vars.user = auth.user_id

    if request.vars.image is not None:
        form.vars.name = request.vars.image.filename
    
    if form.process().accepted:
        id = 0
        if request.vars.song_id:
            table, id = db.songs, request.vars.song_id
        elif request.vars.inst_id:
            table, id = db.instruments, request.vars.inst_id

        if id:
            dbset = db((table.id == id) & (table.author == auth.user_id))
            dbset.validate_and_update(image=form.vars.id)

        return {}
    elif form.errors:
        return { 'form': form, 'error': 'Form has errors' }
    else:
        return { 'form': form }


