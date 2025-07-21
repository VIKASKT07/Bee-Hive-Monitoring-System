from flask import Flask,request,jsonify,render_template
from datetime import datetime , timedelta
from model import GasPredictor
from db_init import db,GasEvent , WeightEvent
from math import floor

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gas.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] =False

db.init_app(app)

predictor = GasPredictor(retrain_every=20)   # tune to taste

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/gas')
def dashboard():
    return render_template('dashboard.html')

@app.route('/weight')
def weight_dashboard():
    return render_template('weight.html')


@app.route('/api/gas',methods=['POST'])
def log_gas():
    data = request.get_json(force=True)
    value = int(data['value'])
    ts = datetime.fromisoformat(data['ts'])

    event =GasEvent(value=value ,ts=ts)
    db.session.add(event)
    db.session.commit()

    rows = [(e.ts, e.value) for e in GasEvent.query.order_by(GasEvent.id)]
    predictor.maybe_retrain(rows)

    print(f"Saved event ->value = {value},ts={ts}")

    return jsonify({
        "stored " : True,
        "value" : value,
        "ts" : ts.isoformat()
    }), 201

@app.route('/api/weight',methods = ['POST'])
def log_weight():
    data = request.get_json(force=True)
    weight = float(data['weight'])
    ts = datetime.fromisoformat(data['ts'])

    event = WeightEvent(weight = weight , ts=ts)
    db.session.add(event)
    db.session.commit()

    print(f"Saved weight ->  {weight}g at {ts}")

    return jsonify({
        "stored" : True,
        "weight" : weight,
        "ts" : ts.isoformat()
    }),201


@app.route('/api/weight/last/<int:n>', methods=['GET'])
def get_last_weights(n):
    rows = (WeightEvent.query
            .order_by(WeightEvent.id.desc())
            .limit(n)
            .all())

    out = []
    for r in rows:  
        timestamp = r.ts.isoformat() if isinstance(r.ts, datetime) else str(r.ts)
        out.append({
            "id": r.id,
            "weight": r.weight,
            "timestamp": timestamp
        })

    return jsonify(out), 200



@app.route('/predict',methods=['GET'])
def predict():
    last_event = GasEvent.query.order_by(GasEvent.id.desc()).first()
    if not last_event:
        print("❌ No gas event found.")
        predicted_list  = ["No gas event found"]
        return render_template('prediction.html', predictions=predicted_list)
    
    last_ts = last_event.ts
    print(f"📅 Raw last_event.ts: {last_ts} ({type(last_ts)})")
    if isinstance(last_ts, str):
        last_ts = datetime.fromisoformat(last_ts)  # or pd.to_datetime(last_ts)
    print(f"✅ Converted last_ts: {last_ts}")

    eta = predictor.eta_hours(last_ts)
    print("ETA raw:", eta)

    if eta is not None and eta > 0:
        future_ts = last_ts + timedelta(hours=eta)
        print(f"📅 Predicting for future_ts: {future_ts}")
        y_hat = predictor.expected_value(future_ts)
    else:
        print("⚠️ ETA is None or <= 0 → No future prediction.")
        y_hat = None

    print("Predicted value at leak:", y_hat)
    
    if eta is None or y_hat is None:
        print("empty")
        predicted_list = ["Prediction Unavaliable"]
    else:
        # Format ETA into readable units
        eta_days = int(eta // 24)
        eta_hours = int(eta % 24)
        eta_string = f"{eta_days} day(s), {eta_hours} hour(s)"

        predicted_list = [
            f"Estimated_Time: {eta_string}",
            f"Predicted gas level at leak: {round(y_hat, 2)} ppm"
        ]

    return render_template('prediction.html' , predictions=predicted_list)


@app.route('/api/gas/last/<int:n>' , methods = ['GET'])
def get_last(n):
    rows = (GasEvent.query.
            order_by(GasEvent.id.desc())
            .limit(n)
            .all())
    
    out = []
    for r in rows:
        timestamp = r.ts.isoformat() if isinstance(r.ts, datetime) else str(r.ts)
        out.append({
            "id": r.id,
            "value": r.value,
            "timestamp": timestamp
        })

    return jsonify(out), 200

@app.route('/api/gas/all', methods=['GET'])
def get_all():
    rows = GasEvent.query.order_by(GasEvent.id).all()
    out = [
        {"id": r.id,
         "value": r.value,
         "timestamp": r.ts.isoformat()}
        for r in rows
    ]
    return jsonify(out), 200


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        rows = [(e.ts, e.value) for e in GasEvent.query.order_by(GasEvent.id)]
        predictor.maybe_retrain(rows)
    # with app.app_context():
    #     rows = GasEvent.query.order_by(GasEvent.id).all()
    #     for i, r in enumerate(rows):
    #         print(f"{i}: id={r.id}, value={r.value}, ts={r.ts}")

    app.run(host='0.0.0.0', port=5000, debug=True)