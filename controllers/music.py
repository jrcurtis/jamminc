
def edit():
    return {}

def browse():
    return {}

@request.restful()
def instrument():
    def GET(inst_id):
        return_data = {}

        inst = db.instruments[inst_id]

        if inst is not None:
            return_data.name = inst.name
            return_data.data = inst.data
        else:
            return_data.error = 'No such instrument'

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
def track():
    def GET(track_id):
        return_data = {}

        track = db.tracks[track_id]

        if track is not None:
            return_data.name = track.name
            return_data.data = track.data
        else:
            return_data.error = 'No such track'

        return return_data

    def POST(song_id, name, data):
        return_data = {}

        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            result = db.tracks.validate_and_insert(
                song=song_id, name=name, data=data, author=auth.user_id)

            if result.errors:
                return_data['error'] = 'Database error'
                logger.info("Database error on track create: {}"
                            .format(result.errors))
            else:
                db.commit()
                return_data['track_id'] = result.id

        return return_data

    def PUT(track_id, name, data):
        return_data = {}

        if not auth.user:
            return_data['error'] = 'Must be logged in'
        else:
            track_query = ((db.tracks.id == track_id)
                           & (db.tracks.author == auth.user_id))
            result = db(track_query).validate_and_update(name=name, data=data)

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
            return_data.name = song.name
            return_data.data = song.data
        else:
            return_data.error = 'No such song'

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


