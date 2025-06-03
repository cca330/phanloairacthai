const imageInput = document.getElementById('imageInput');
const classifyBtn = document.getElementById('classifyBtn');
const imagePreview = document.getElementById('imagePreview');
const resultArea = document.getElementById('resultArea');

const openCameraBtn = document.getElementById('openCameraBtn');
const cameraContainer = document.getElementById('cameraContainer');
const video = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");



let uploadedImageDataUrl = null;
let stream = null;
let model ;


function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


document.getElementById('imageInput').addEventListener('change', handleImageUpload);
async function handleImageUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = async (e) => {
    uploadedImageDataUrl = e.target.result;
    showPreview(uploadedImageDataUrl);
    classifyBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}



function logError(error) {
    console.error("Camera error:", error);
    alert("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập hoặc thiết bị của bạn.");
}

imageInput.addEventListener('change', () => {
    stopCameraIfActive();
    const file = imageInput.files[0];
    if (!file || !file.type.startsWith('image/')) {
        resetPreview();
        alert('Vui lòng chọn tệp hình ảnh hợp lệ.');
        return;
    }
    const reader = new FileReader();
    reader.onload = e => {
        uploadedImageDataUrl = e.target.result;
        showPreview(uploadedImageDataUrl);
        classifyBtn.disabled = false;
        resultArea.textContent = '';
    };
    reader.readAsDataURL(file);
});

openCameraBtn.addEventListener('click', async () => {
  if (stream) return;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.play();
    cameraContainer.hidden = false;
    classifyBtn.disabled = true;
    resultArea.textContent = '';
    resetPreview();

    isDetecting = true;
    detectLoop(); // ✅ bắt đầu detect liên tục
  } catch (e) {
    alert("Không thể mở camera.");
  }
});


captureBtn.addEventListener('click', () => {
    if (!stream) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    uploadedImageDataUrl = canvas.toDataURL('image/png');
    showPreview(uploadedImageDataUrl);
    classifyBtn.disabled = false;
    resultArea.textContent = '';
});

closeCameraBtn.addEventListener('click', () => {
    stopCameraIfActive();
    resetPreview();
});

function stopCameraIfActive() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    cameraContainer.hidden = true;
    video.srcObject = null;
}

classifyBtn.addEventListener('click', async () => {
    if (!uploadedImageDataUrl) {
        alert("Vui lòng tải lên hoặc chụp ảnh trước.");
        return;
    }

    resultArea.innerText = "Đang phân tích bằng AI...";
    await predictWithRoboflow(uploadedImageDataUrl);
});


function showPreview(dataUrl) {
    imagePreview.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = 'Ảnh rác thải';
    imagePreview.appendChild(img);
}

function resetPreview() {    uploadedImageDataUrl = null;
    imagePreview.innerHTML = '<span>Ảnh rác sẽ hiển thị ở đây</span>';
    classifyBtn.disabled = true;
    resultArea.textContent = '';
}
// Khởi tạo bản đồ Leaflet
document.addEventListener("DOMContentLoaded", () => {
    const mapContainer = document.getElementById("mapContainer");
    const map = L.map(mapContainer).setView([21.0285, 105.8542], 13); // Hà Nội, Việt Nam (ví dụ)

    // Thêm lớp bản đồ
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Xử lý sự kiện khi nhấp vào bản đồ
    map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`<b>Vị trí báo cáo</b><br>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`).openPopup();
    });
});

// Tạo dữ liệu bảng xếp hạng từ localStorage hoặc khởi tạo trống
let leaderboardData = JSON.parse(localStorage.getItem("leaderboardData")) || [];

// Hàm hiển thị bảng xếp hạng
function updateLeaderboard() {
    const leaderboardList = document.getElementById("leaderboardList");
    leaderboardList.innerHTML = "";
    leaderboardData
        .sort((a, b) => b.points - a.points)
        .forEach(user => {
            const li = document.createElement("li");
            li.textContent = `${user.name} - ${user.points} điểm`;
            leaderboardList.appendChild(li);
        });
}

// Hàm lưu dữ liệu vào localStorage
function saveLeaderboardData() {
    localStorage.setItem("leaderboardData", JSON.stringify(leaderboardData));
}

// Xử lý khi gửi báo cáo
     document.getElementById("submitReportBtn").addEventListener("click", () => {
         const reportLocation = document.getElementById("reportLocation").value.trim();
         const reporterName = prompt("Vui lòng nhập tên của bạn:");
         
         if (reportLocation === "" || !reporterName) {
             alert("Vui lòng nhập địa điểm và tên hợp lệ.");
             return;
         }

         // Lưu báo cáo vào Local Storage
         let reports = JSON.parse(localStorage.getItem("reports")) || [];
         reports.push({ location: reportLocation, name: reporterName });
         localStorage.setItem("reports", JSON.stringify(reports));

         alert(`🎉 Báo cáo thành công: ${reportLocation}`);
         document.getElementById("reportLocation").value = "";
     });
     

// Khởi tạo bảng xếp hạng khi trang tải
document.addEventListener("DOMContentLoaded", () => {
    updateLeaderboard();
    document.getElementById("communitySection").hidden = false;
});
const reportData = JSON.parse(localStorage.getItem("reports")) || [];




async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.play();

        video.onloadeddata = () => {
            console.log("Camera đã sẵn sàng, bắt đầu nhận diện...");
            processFrame();
        };

    } catch (error) {
        console.error("Lỗi khi bật camera:", error);
    }
}





async function predictWithRoboflow(base64) {
  const url = "https://detect.roboflow.com/racthai-cjyar/3?api_key=Jhg0NWBB3hImNa6L6iDo&confidence=0.3";//tải phiên bản ver2

  const res = await fetch(url, {
    method: "POST",
    body: base64.split(",")[1],
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  console.log("✅ Roboflow AI đã gọi thành công.");


  const result = await res.json();

  const img = new Image();
  img.src = base64;
  await img.decode();

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  result.predictions.forEach((pred) => {
    const x = pred.x - pred.width / 2;
    const y = pred.y - pred.height / 2;
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, pred.width, pred.height);
    ctx.font = "16px Arial";
    ctx.fillStyle = "#00FF00";
    ctx.fillText(`${pred.class} (${(pred.confidence * 100).toFixed(1)}%)`, x, y - 5);
  });

  resultArea.innerText = `Phát hiện ${result.predictions.length} đối tượng.`;
}





async function detectLoop() {
  if (!isDetecting || !stream) return;
  if (video.videoWidth === 0 || video.videoHeight === 0) {
  setTimeout(() => detectLoop(), 500); // Đợi rồi thử lại
  return;
  }


  const canvasTemp = document.createElement("canvas");
  canvasTemp.width = video.videoWidth;
  canvasTemp.height = video.videoHeight;
  const ctxTemp = canvasTemp.getContext("2d");
  ctxTemp.drawImage(video, 0, 0);

  const base64 = canvasTemp.toDataURL("image/jpeg");

  await predictWithRoboflow(base64); // Gửi lên AI Roboflow

  // Lặp lại sau 1 giây
  setTimeout(() => {
    detectLoop();
  }, 100);
}


