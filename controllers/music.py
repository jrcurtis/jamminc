
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
        if request.args[0] == 'song':
            return_data['song_id'] = 'new'
        elif request.args[0] == 'instrument':
            return_data['inst_id'] = 'new'
        else:
            raise HTTP(404)

    elif len(request.args) == 2:
        if request.args[0] == 'song':
            return_data['song_id'] = request.args[1]
        elif request.args[0] == 'instrument':
            return_data['inst_id'] = request.args[1]
        else:
            raise HTTP(404)

    else:
        raise HTTP(404)

    return return_data

def browse():
    return_data = {}

    if len(request.args) == 1:
        if request.args[0] == 'songs':
            pass
        elif request.args[0] == 'instruments':
            pass
        else:
            raise HTTP(404)
    elif len(request.args) > 1:
        raise HTTP(404)

    return_data.update(browse_page({
                'songs': db.songs,
                'instruments': db.instruments
                }))

    return return_data

def view():
    return_data = {}

    song = instrument = None
    
    if len(request.args) != 2:
        raise HTTP(404)

    if request.args[0] == 'instruments':
        instrument = (
            db(db.instruments.id == request.args[1])
            .select(db.instruments.id, db.instruments.name,
                    db.instruments.description,
                    db.instruments.author, db.instruments.created)
            .first())

        if not instrument:
            raise HTTP(404)

        return_data['instrument'] = instrument
        return_data['author'] = db.auth_user[instrument.author]

        return_data['comments'] = (
            db(db.comments.instrument == instrument.id)
            .select(db.comments.text, db.comments.created,
                    db.auth_user.id, db.auth_user.username))

        return_data['browse_data'] = {}

        db.comments.instrument.default = instrument.id

    elif request.args[0] == 'songs':
        song = (
            db(db.songs.id == request.args[1])
            .select(db.songs.id, db.songs.name, db.songs.author,
                    db.songs.description, db.songs.created)
            .first())

        if not song:
            raise HTTP(404)

        return_data['song'] = song
        return_data['author'] = db.auth_user[song.author]

        return_data.update(browse_page({
                    'tracks': db.tracks.song == song.id,
                    'instruments': (
                        (db.tracks.song == song.id)
                        & (db.tracks.instrument == db.instruments.id))
                    }))

        db.comments.song.default = song.id

    else:
        raise HTTP(404)

    if auth.user:
        comment_form = SQLFORM(db.comments)
        comment_form.process()
    else:
        comment_form = 'Log in to comment.'

    comments_query = ((db.comments.song if song else db.comments.instrument)
                      == (song.id if song else instrument.id))
    return_data['comments'] = (
        db(comments_query)
        .select(db.comments.text, db.comments.created,
                db.auth_user.id, db.auth_user.username))


    return_data['song'] = song
    return_data['instrument'] = instrument
    return_data['comment_form'] = comment_form

    return return_data

@request.restful()
def instrument():
    def GET(inst_id):
        return_data = {}

        inst = db.instruments[inst_id]

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
                return_data['inst_id'] = result.id

        return return_data

    def PUT(inst_id, name, data):
        return_data = {}

        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            inst_query = ((db.instruments.id == inst_id)
                          & (db.instruments.author == auth.user_id))
            result = db(inst_query).validate_and_update(name=name, data=data)

            if result.errors:
                return_data['error'] = 'Database error'
                logger.info("Database error on instrument update: {}"
                            .format(result.errors))
            else:
                db.commit()

        return return_data

    def DELETE(inst_id):
        return_data = {}
        
        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            inst_query = ((db.instruments.id == inst_id)
                          & (db.instruments.author == auth.user_id))
            db(inst_query).delete()
            db.commit()

        return return_data

    return locals()

@request.restful()
def instruments():
    def GET():
        instruments_query = db.instruments.author == auth.user_id
        favorites_query = (
            (db.favorite_instruments.user == auth.user_id)
            & (db.favorite_instruments.instrument == db.instruments.id))

        instruments = db(instruments_query).select(
            db.instruments.id, db.instruments.name).as_list()
        instruments += db(favorites_query).select(
            db.instruments.id, db.instruments.name).as_list()

        return {
            'instruments': map(lambda r: [r['name'], r['id']], instruments)
            }

    return locals()

@request.restful()
def track():
    def GET(track_id):
        return_data = {}

        track = db.tracks[track_id]

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
                return_data['track_id'] = result.id

        return return_data

    def PUT(track_id, name, data, inst_id=0):
        return_data = {}

        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            track_query = ((db.tracks.id == track_id)
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

    def DELETE(track_id):
        return_data = {}
        
        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            track_query = ((db.tracks.id == track_id)
                           & (db.tracks.author == auth.user_id))
            db(track_query).delete()
            db.commit()

        return return_data

    return locals()

@request.restful()
def song():
    def GET(song_id):
        return_data = {}

        song = db.songs[song_id]

        if song is not None:
            return_data['name'] = song.name
            tracks_query = db.tracks.song == song_id
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
                return_data['song_id'] = result.id

        return return_data

    def PUT(song_id, name):
        return_data = {}

        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            song_query = ((db.songs.id == song_id)
                          & (db.songs.author == auth.user_id))
            result = db(song_query).validate_and_update(name=name)

            if result.errors:
                return_data['error'] = 'Database error'
                logger.info("Database error on song update: {}"
                            .format(result.errors))
            else:
                db.commit()

        return return_data

    def DELETE(song_id):
        return_data = {}
        
        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            song_query = ((db.songs.id == song_id)
                          & (db.songs.author == auth.user_id))
            db(song_query).delete()
            db.commit()

        return return_data

    return locals()


