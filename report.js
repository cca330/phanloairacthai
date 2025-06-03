/*const reportData = [
  { type: "Rác thải nguy hiểm", quantity: 100 },
  { type: "Rác thải hữu cơ", quantity: 200 },
  { type: "Rác tái chế", quantity: 50 },
  { type: "Rác không tái chế", quantity: 150 },
];

function displayReport() {
  const reportTableBody = document.getElementById("reportTableBody");
  reportTableBody.innerHTML = "";
  reportData.forEach((data) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${data.type}</td>
      <td>${data.quantity}</td>
    `;
    reportTableBody.appendChild(row);
  });
}*/

     const reportData = JSON.parse(localStorage.getItem("reports")) || [];

     function displayReport() {
         const reportTableBody = document.getElementById("reportTableBody");
         reportTableBody.innerHTML = "";
         reportData.forEach((data) => {
             const row = document.createElement("tr");
             row.innerHTML = `
                 <td>${data.location}</td>
                 <td>${data.name}</td>
             `;
             reportTableBody.appendChild(row);
         });
     }

     displayReport();
     