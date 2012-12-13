
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
            if request.vars.fork:
                return_data['song_id'] = forked_song(request.vars.fork) or 'new'
            else:
                return_data['song_id'] = 'new'
        elif request.args[0] == 'instruments':
            if request.vars.fork:
                return_data['inst_id'] = forked_instrument(request.vars.fork) or 'new'
            else:
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

    if len(request.args) != 2:
        raise HTTP(404)

    type, id = request.args
    song_id = id if type == 'songs' else 0
    inst_id = id if type == 'instruments' else 0

    if type in ('songs', 'instruments'):
        table = db[type]

        query = ((table.id == id)
                 & (table.image == db.images.id)
                 & (table.author == db.auth_user.id))

        original = table.with_alias('original')

        left = [db.audio.on(table.audio == db.audio.id),
                db.ratings.on((db.ratings.user == auth.user_id)
                              & (db.ratings.instrument == inst_id)
                              & (db.ratings.song == song_id)),
                db.favorites.on((db.favorites.user == auth.user_id)
                                & (db.favorites.instrument == inst_id)
                                & (db.favorites.song == song_id)),
                original.on(table.original == original.id)]

        row = (
            db(query)
            .select(table.id, table.name, table.description,
                    table.author, table.created,
                    table.upvotes, table.downvotes,
                    db.images.image, db.audio.audio,
                    db.auth_user.id, db.auth_user.username,
                    db.ratings.up, db.favorites.id,
                    original.id, original.name,
                    left=left)
            .first())

        logger.info('row {}'.format(row))

        if not row:
            raise HTTP(404)

        if type == 'instruments':
            instrument = row.instruments
            return_data['browse_data'] = {}
            db.comments.instrument.default = inst_id
        elif type == 'songs':
            song = row.songs
            return_data.update(browse_page({
                        'tracks': db.tracks.song == song_id,
                        'instruments': (
                            (db.tracks.song == song_id)
                            & (db.tracks.instrument == db.instruments.id))
                        }))
            db.comments.song.default = song_id
    else:
        raise HTTP(404)

    if auth.user:
        crud.messages.record_created = 'Comment posted'
        comment_form = crud.create(db.comments)
    else:
        comment_form = SPAN('Log in to comment.', _class='notice')

    comments_query = (
        ((db.comments.song if song else db.comments.instrument) == id)
        & (db.comments.author == db.auth_user.id)
        & (db.auth_user.avatar == db.images.id))
    return_data['comments'] = (
        db(comments_query)
        .select(db.comments.text, db.comments.created,
                db.auth_user.id, db.auth_user.username,
                db.images.image))


    return_data['song'] = song
    return_data['instrument'] = instrument
    return_data['thing'] = song if song else instrument
    return_data['thing_type'] = type
    return_data['original'] = row.original
    return_data['author'] = row.auth_user
    return_data['image'] = row.images.image
    return_data['audio'] = row.audio.audio
    return_data['rating'] = row.ratings
    return_data['favorite'] = row.favorites
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
                (db.favorites.user == auth.user_id)
                & (db.favorites.instrument == db.instruments.id))
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
            try:
                inst_id = int(inst_id)
            except:
                inst_id = 0
            
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
            try:
                inst_id = int(inst_id)
            except:
                inst_id = 0
            
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
        table, id = db.songs, request.vars.song_id
    elif request.vars.inst_id:
        table, id = db.instruments, request.vars.inst_id
    else:
        raise HTTP(400)

    dbset = db((table.id == id) & (table.author == auth.user_id))
    record = dbset.select().first()
    if not record:
        raise HTTP(404)

    form = SQLFORM(table, record, fields=['description'], showid=False)
 
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

def audio():
    if not auth.user:
        return { 'error': 'Must be logged in' }

    if request.vars.song_id:
        table, id = db.songs, request.vars.song_id
    elif request.vars.inst_id:
        table, id = db.instruments, request.vars.inst_id
    else:
        raise HTTP(400)

    row = db(table.id == id).select(table.name).first()
    if not row:
        raise HTTP(404)

    result = db.audio.validate_and_insert(
        audio=db.audio.audio.store(request.vars.audio.file,
                                   '{}.wav'.format(row.name)),
        user=auth.user_id)

    if not result.errors:
        dbset = db((table.id == id) & (table.author == auth.user_id))
        dbset.validate_and_update(audio=result.id)
        return {}
    else:
        return { 'error': 'Database error' }

@request.restful()
def rate():
    def POST(up, song_id=0, inst_id=0):
        if not auth.user:
            return { 'error': 'Must be logged in' }

        up = up == 'true'

        if song_id:
            table, id = db.songs, song_id
            inst_id = 0
        elif inst_id:
            table, id = db.instruments, inst_id
            song_id = 0

        dbset = db((db.ratings.instrument == inst_id)
                   & (db.ratings.song == song_id)
                   & (db.ratings.user == auth.user_id))
        if dbset.count():
            return { 'error': "You've already rated this" }

        logger.info('about to insert {}')
        result = db.ratings.validate_and_insert(
            song=song_id, instrument=inst_id, up=up, user=auth.user_id)

        if result.errors:
            return { 'error': 'Database error' }
        else:
            db.commit()
            logger.info('about to update {} {} {}'.format(table, id, table.upvotes))
            dbset = db(table.id == id)
            logger.info('dbset {} {}'.format(dbset, dbset.count()))
            amt = 1 if up else 0
            dbset.update(
                upvotes=table.upvotes + amt,
                downvotes=table.downvotes + (1 - amt))
            return {}

    return locals()

@request.restful()
def favorite():
    def POST(song_id=0, inst_id=0):
        if not auth.user:
            return { 'error': 'Must be logged in' }

        if song_id:
            inst_id = 0
        elif inst_id:
            song_id = 0

        dbset = db((db.favorites.instrument == inst_id)
                   & (db.favorites.song == song_id)
                   & (db.favorites.user == auth.user_id))
        if dbset.count():
            return { 'error': "You've already favorited this" }

        result = db.favorites.validate_and_insert(
            song=song_id, instrument=inst_id, user=auth.user_id)

        if result.errors:
            return { 'error': 'Database error' }
        else:
            return {}

    return locals()

