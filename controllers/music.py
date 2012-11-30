
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

        result = db.instruments.validate_and_insert(
            name=name, data=data, author=auth.user_id)

        if result.errors:
            return_data['error'] = 'Database error'
            logger.info("Database error on instrument create: {}"
                        .format(result.errors))
        else:
            db.commit()

        return return_data

    def PUT(inst_id, name, data):
        return_data = {}

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
        
        inst_query = ((db.instruments.id == inst_id)
                      & (db.instruments.author == auth.user_id))
        db(inst_query).delete()
        db.commit()

        return return_data

    return locals()

@request.restful()
def track():
    def GET(inst_id):
        print 'got args', request.args
        return {}

    def POST():
        return {}

    def PUT():
        return {}

    def DELETE():
        return {}

    return locals()


