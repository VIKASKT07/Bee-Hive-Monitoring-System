from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class GasEvent(db.Model):
    id = db.Column(db.Integer , primary_key =True)
    value = db.Column(db.Integer , nullable =True)
    ts = db.Column(db.Integer , nullable =True)
    
class WeightEvent(db.Model):
    id = db.Column(db.Integer , primary_key = True)
    weight = db.Column(db.Float , nullable = False)
    ts = db.Column(db.DateTime , nullable = False)