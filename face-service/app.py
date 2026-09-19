import base64
import os
import tempfile
from flask import Flask, jsonify, request
import face_recognition
import numpy as np

app = Flask(__name__)
MAX_IMAGE_BYTES = 2 * 1024 * 1024
TOLERANCE = float(os.getenv("FACE_MATCH_TOLERANCE", "0.48"))


def image_bytes(value):
    if not isinstance(value, str):
        raise ValueError("image is required")
    if value.startswith("data:"):
        value = value.split(",", 1)[1]
    raw = base64.b64decode(value, validate=True)
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("image is too large")
    return raw


def encoding_from_image(value):
    raw = image_bytes(value)
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=True) as f:
        f.write(raw)
        f.flush()
        image = face_recognition.load_image_file(f.name)
    locations = face_recognition.face_locations(image, model="hog")
    if len(locations) != 1:
        raise ValueError("Exactly one face must be visible")
    encodings = face_recognition.face_encodings(image, known_face_locations=locations)
    if not encodings:
        raise ValueError("Face encoding could not be created")
    return encodings[0]


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "LegalLock Face Verification"})


@app.post("/encode")
def encode():
    try:
        encoding = encoding_from_image(request.get_json(force=True).get("image"))
        return jsonify({"encoding": encoding.tolist()})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 422


@app.post("/verify")
def verify():
    try:
        body = request.get_json(force=True)
        probe = encoding_from_image(body.get("image"))
        stored = np.asarray(body.get("encoding"), dtype=np.float64)
        if stored.shape != (128,):
            raise ValueError("Invalid stored face template")
        distance = float(face_recognition.face_distance([stored], probe)[0])
        return jsonify({"verified": bool(distance <= TOLERANCE), "distance": distance})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 422


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5001")))
