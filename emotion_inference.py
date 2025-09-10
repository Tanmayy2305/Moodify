import cv2
import numpy as np
import joblib
import json
import sys
import os
from skimage.feature import hog

# Get absolute paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'emotion_model.pkl')
CASCADE_PATH = '/Users/tanmayshelar/Desktop/modify-music-app/venv/lib/python3.13/site-packages/cv2/data/haarcascade_frontalface_default.xml'

# Verify model file exists
if not os.path.exists(MODEL_PATH):
    print(f"[ERROR] Model file not found at: {MODEL_PATH}")
    sys.exit(1)

# Load trained model
try:
    # Try to load the advanced model first
    advanced_model_path = os.path.join(BASE_DIR, 'emotion_model_advanced.pkl')
    if os.path.exists(advanced_model_path):
        model_data = joblib.load(advanced_model_path)
        model = model_data['model']
        label_encoder = model_data['label_encoder']
        input_shape = model_data['input_shape']
        print(f"[INFO] Successfully loaded advanced model from: {advanced_model_path}")
    else:
        # Fall back to the original model
        model_data = joblib.load(MODEL_PATH)
        model = model_data['model']
        label_encoder = model_data['label_encoder']
        input_shape = model_data['input_shape']
        print(f"[INFO] Successfully loaded model from: {MODEL_PATH}")
except Exception as e:
    print(f"[ERROR] Failed to load model: {str(e)}")
    sys.exit(1)

def process_image(image_path):
    try:
        print(f"[INFO] Processing image: {image_path}")
        print(f"[INFO] File exists: {os.path.exists(image_path)}")
        
        # Read the image from file
        frame = cv2.imread(image_path)
        if frame is None:
            print(f"[ERROR] Could not read image at {image_path}")
            return {"emotion": "unknown", "confidence": 0, "error": f"Could not read image at {image_path}"}
        
        print(f"[INFO] Image shape: {frame.shape}")
        
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Apply histogram equalization to improve contrast
        gray = cv2.equalizeHist(gray)
        
        # Apply Gaussian blur to reduce noise
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Load face cascade with absolute path
        cascade_path = '/Users/tanmayshelar/Desktop/modify-music-app/venv/lib/python3.13/site-packages/cv2/data/haarcascade_frontalface_default.xml'
        print(f"[INFO] Loading cascade from: {cascade_path}")
        
        if not os.path.exists(cascade_path):
            print(f"[ERROR] Cascade file not found at: {cascade_path}")
            return {"emotion": "unknown", "confidence": 0, "error": "Face detection model not found"}
        
        face_cascade = cv2.CascadeClassifier(cascade_path)
        if face_cascade.empty():
            print("[ERROR] Failed to load face cascade")
            return {"emotion": "unknown", "confidence": 0, "error": "Failed to load face detector"}
        
        # Detect faces with adjusted parameters
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,  # More gradual scaling
            minNeighbors=4,   # Fewer neighbors required
            minSize=(30, 30)  # Minimum face size
        )
        print(f"[INFO] Detected {len(faces)} faces")
        
        if len(faces) == 0:
            print("[ERROR] No face detected in image")
            return {"emotion": "unknown", "confidence": 0, "error": "No face detected"}
        
        # Use the first detected face
        x, y, w, h = faces[0]
        face_roi = gray[y:y+h, x:x+w]
        
        # Resize to match model input size
        resized = cv2.resize(face_roi, input_shape)
        print(f"[INFO] Resized face shape: {resized.shape}")
        
        # Check if we're using the advanced model (with HOG features)
        if input_shape == (64, 64):
            # Extract HOG features for advanced model
            features = hog(resized, orientations=8, pixels_per_cell=(8, 8),
                          cells_per_block=(2, 2), visualize=False)
            model_input = features.reshape(1, -1)
        else:
            # Use pixel values for original model
            model_input = resized.flatten().reshape(1, -1)
        
        # Prediction
        prediction_idx = model.predict(model_input)[0]
        emotion_label = label_encoder.inverse_transform([prediction_idx])[0]
        confidence = model.predict_proba(model_input).max() * 100
        print(f"[INFO] Predicted emotion: {emotion_label}, confidence: {confidence}%")
        
        # Apply higher threshold for more confident predictions
        if confidence < 40:
            result = {"emotion": "unknown", "confidence": float(confidence)}
        else:
            result = {"emotion": str(emotion_label), "confidence": float(confidence)}
        
        return result
        
    except Exception as e:
        print(f"[ERROR] Exception during processing: {str(e)}")
        return {"emotion": "unknown", "confidence": 0, "error": str(e)}

def live_emotion_test():
    # Initialize face cascade classifier
    face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
    if face_cascade.empty():
        print(json.dumps({"emotion": "unknown", "confidence": 0, "error": "Failed to load face detector"}))
        sys.exit(1)
        
    cam = cv2.VideoCapture(0, cv2.CAP_AVFOUNDATION)  # Use CAP_AVFOUNDATION for macOS
    if not cam.isOpened():
        print(json.dumps({"emotion": "unknown", "confidence": 0, "error": "Failed to open camera"}))
        sys.exit(1)

    print("[INFO] Press SPACE to detect emotion, ESC to quit")

    while True:
        ret, frame = cam.read()
        if not ret:
            continue

        # Convert to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Detect faces
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=4,
            minSize=(30, 30)
        )
        
        # Draw rectangle and emotion label around detected face
        display_frame = frame.copy()
        for (x, y, w, h) in faces:
            cv2.rectangle(display_frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            # Process face for emotion
            face_roi = gray[y:y+h, x:x+w]
            resized = cv2.resize(face_roi, input_shape).flatten().reshape(1, -1)
            prediction_idx = model.predict(resized)[0]
            emotion_label = label_encoder.inverse_transform([prediction_idx])[0]
            confidence = model.predict_proba(resized).max() * 100
            
            # Only show emotion if confidence is above threshold
            if confidence >= 40:
                label = f'{emotion_label}: {confidence:.1f}%'
                cv2.putText(display_frame, label, (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
            else:
                cv2.putText(display_frame, 'Face Detected', (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        
        # Show live camera feed
        cv2.imshow("Live Emotion Detection - Press SPACE to Capture | ESC to Exit", display_frame)

        key = cv2.waitKey(1)

        if key == 27:  # ESC key → quit
            break

        elif key == 32:  # SPACE key → detect emotion
            # Convert to grayscale
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Apply histogram equalization to improve contrast
            gray = cv2.equalizeHist(gray)
            
            # Apply Gaussian blur to reduce noise
            gray = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Detect faces
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(30, 30)
            )
            
            if len(faces) == 0:
                result = {"emotion": "unknown", "confidence": 0, "error": "No face detected"}
            else:
                # Use the first detected face
                x, y, w, h = faces[0]
                face_roi = gray[y:y+h, x:x+w]
                
                # Resize and prepare for model input
                resized = cv2.resize(face_roi, input_shape).flatten().reshape(1, -1)

                # Prediction
                prediction_idx = model.predict(resized)[0]
                emotion_label = label_encoder.inverse_transform([prediction_idx])[0]
                confidence = model.predict_proba(resized).max() * 100

                # Apply higher threshold for more confident predictions
                if confidence < 40:
                    result = {"emotion": "unknown", "confidence": float(confidence)}
                else:
                    result = {"emotion": str(emotion_label), "confidence": float(confidence)}

            print(json.dumps(result))  # output result
            sys.stdout.flush()

    cam.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Process image file passed as argument
        image_path = sys.argv[1]
        result = process_image(image_path)
        print(json.dumps(result))
    else:
        # No arguments, run live camera test
        live_emotion_test()
