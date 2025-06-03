#from flask import Flask, render_template, request, jsonify
import os

from flask import Flask, render_template, request, redirect,jsonify, url_for, send_from_directory
import numpy as np
import cv2
import onnxruntime as ort



app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads/'  # Đường dẫn đến thư mục uploads

# Khởi tạo danh sách báo cáo
reports = []

@app.route('/')
def index():
    return render_template('giaodien.html')  # Sử dụng giaodien.html làm giao diện chính

@app.route('/submit_report', methods=['POST'])
def submit_report():
    location = request.form.get('location')
    waste_type = request.form.get('wasteType')
    timestamp = request.form.get('timestamp')

    # Thêm báo cáo vào danh sách
    reports.append({'location': location, 'wasteType': waste_type, 'timestamp': timestamp})

    return jsonify({'status': 'success', 'reports': reports})

@app.route('/get_reports', methods=['GET'])
def get_reports():
    return jsonify(reports)

if __name__ == '__main__':
    # Tạo thư mục uploads nếu chưa tồn tại
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    app.run(debug=True)


# Import the InferencePipeline object
from inference import InferencePipeline
import cv2

def my_sink(result, video_frame):
    if result.get("output_image"): # Display an image from the workflow response
        cv2.imshow("Workflow Image", result["output_image"].numpy_image)
        cv2.waitKey(1)
    print(result) # do something with the predictions of each frame


# initialize a pipeline object
pipeline = InferencePipeline.init_with_workflow(
    api_key="Jhg0NWBB3hImNa6L6iDo",
    workspace_name="phanloairac",
    workflow_id="custom-workflow",
    video_reference=0, # Path to video, device id (int, usually 0 for built in webcams), or RTSP stream url
    max_fps=30,
    on_prediction=my_sink
)
pipeline.start() #start the pipeline
pipeline.join() #wait for the pipeline thread to finish


# Tải mô hình ONNX
# Đảm bảo file best.onnx nằm trong cùng thư mục với app.py
onnx_model_path = "best.onnx"
try:
    ort_session = ort.InferenceSession(onnx_model_path)
    print("✅ Mô hình ONNX đã được tải thành công.")
except Exception as e:
    print(f"❌ Lỗi khi tải mô hình ONNX: {e}")
    ort_session = None # Đặt về None nếu tải thất bại

# Lấy tên các lớp từ file data.yaml (Bạn cần tạo file này nếu chưa có)
# Giả sử bạn có một file data.yaml với định dạng:
# names: ['class1', 'class2', ...]
# Tạo file data.yaml thủ công nếu cần, với danh sách các lớp của bạn.
data_yaml_path = "/content/racthai-1/data.yaml" # Đường dẫn này là trong Colab, bạn cần tạo một file tương tự
                                              # trên máy cục bộ hoặc nhập thủ công các lớp.
classes = []
# Cách đơn giản nhất là nhập thủ công các tên lớp dựa trên data.yaml của bạn
# Ví dụ:
# classes = ['organic', 'plastic', 'glass', 'paper']
# Hoặc đọc từ file data.yaml nếu bạn có nó trên máy cục bộ:
try:
    with open(data_yaml_path, 'r') as f:
        import yaml
        data = yaml.safe_load(f)
        classes = data['names']
        print(f"✅ Tên các lớp đã được tải: {classes}")
except Exception as e:
    print(f"❌ Lỗi khi đọc file data.yaml hoặc file không tồn tại: {e}")
    print("❗ Vui lòng nhập tên các lớp thủ công nếu cần.")
    # Nếu không đọc được data.yaml, bạn cần nhập thủ công danh sách các lớp tại đây:
    # classes = ['class_name_1', 'class_name_2', ...]


def process_image(image_path):
    if ort_session is None:
        return None, "Lỗi: Không thể tải mô hình."

    img = cv2.imread(image_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_height, img_width = img.shape[:2]

    # Chuẩn bị ảnh đầu vào cho mô hình ONNX (kích thước 640x640)
    input_img = cv2.resize(img, (640, 640))
    input_img = input_img.astype(np.float32) / 255.0
    input_img = np.transpose(input_img, (2, 0, 1)) # Chuyển từ HWC sang CHW
    input_img = np.expand_dims(input_img, axis=0) # Thêm batch dimension

    # Lấy tên input và output của mô hình
    input_name = ort_session.get_inputs()[0].name
    output_name = ort_session.get_outputs()[0].name

    # Chạy inference
    outputs = ort_session.run([output_name], {input_name: input_img})
    predictions = outputs[0][0].T # Lấy kết quả dự đoán và chuyển vị

    # Ngưỡng tin cậy và NMS
    confidence_threshold = 0.3
    iou_threshold = 0.45 # Ngưỡng IOU cho Non-Maximum Suppression

    # Lọc các dự đoán dưới ngưỡng tin cậy
    detections = predictions[predictions[:, 4] > confidence_threshold]

    boxes = []
    confidences = []
    class_ids = []

    for detection in detections:
        confidence = detection[4]
        class_score = detection[5:] # Lấy điểm cho từng lớp
        class_id = np.argmax(class_score)
        class_confidence = class_score[class_id]

        # Chỉ giữ lại các dự đoán có điểm lớp cao nhất và lớn hơn ngưỡng
        if confidence * class_confidence > confidence_threshold:
             # Chuyển định dạng hộp giới hạn từ center_x, center_y, width, height
             # sang x1, y1, x2, y2 (tọa độ góc trên bên trái và góc dưới bên phải)
            center_x, center_y, w, h = detection[0:4]
            x = center_x - w / 2
            y = center_y - h / 2

            boxes.append([float(x), float(y), float(w), float(h)])
            confidences.append(float(confidence * class_confidence))
            class_ids.append(class_id)

    # Áp dụng Non-Maximum Suppression (NMS)
    indices = cv2.dnn.NMSBoxes(boxes, confidences, confidence_threshold, iou_threshold)

    # Vẽ kết quả lên ảnh gốc
    if len(indices) > 0:
        for i in indices.flatten():
            box = boxes[i]
            x, y, w, h = box
            # Chuyển tỷ lệ tọa độ về kích thước ảnh gốc
            x1 = int((x / 640) * img_width)
            y1 = int((y / 640) * img_height)
            x2 = int(((x + w) / 640) * img_width)
            y2 = int(((y + h) / 640) * img_height)

            label = str(classes[class_ids[i]])
            confidence = confidences[i]
            color = (255, 0, 0) # Màu đỏ

            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
            cv2.putText(img, f'{label} {confidence:.2f}', (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # Chuyển ảnh từ RGB sang BGR để lưu hoặc hiển thị bằng OpenCV
    img_result = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # Lưu ảnh kết quả tạm thời
    output_filename = f"result_{os.path.basename(image_path)}"
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
    cv2.imwrite(output_path, img_result)

    return output_filename, None

@app.route('/')
def index():
    # Xóa các file cũ trong thư mục uploads khi tải lại trang chính
    for filename in os.listdir(app.config['UPLOAD_FOLDER']):
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
        except Exception as e:
            print(f"Lỗi khi xóa file {file_path}: {e}")
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return redirect(request.url)
    file = request.files['file']
    if file.filename == '':
        return redirect(request.url)
    if file:
        # Lưu file ảnh gốc
        filename = file.filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        # Xử lý ảnh và nhận file ảnh kết quả
        result_filename, error = process_image(filepath)

        if error:
            return f"Lỗi: {error}", 500 # Trả về lỗi nếu xử lý ảnh thất bại

        # Chuyển hướng đến trang hiển thị kết quả
        return redirect(url_for('uploaded_file', filename=result_filename))

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    # Để chạy trên mạng cục bộ (có thể truy cập từ các thiết bị khác trong cùng mạng)
    # app.run(host='0.0.0.0', port=5000, debug=True)

    # Chỉ chạy trên máy cục bộ
    app.run(debug=True)