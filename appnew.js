// NEW VERSION OF CLIENT

// NÅR SIDEN ER LÆST IND SKRIVES TABELLEN TIL SIDEN VHA. MAKETABLE-FUNKTIONEN
/* window.onload = (event) => {
    makeTable();
    console.log('page is fully loaded');
  };
*/
makeTable();

// HER ER EVENTLISTENER DER TJEKKER OM SUBMIT KNAPPEN BLIVER TRYKKET
document.getElementById("employeeRequest").addEventListener("submit", requestEmployee);

// DENNE FUNKTION FORETAGER KALD TIL SERVERENS API OG GENERERER EN TABEL MED
// DE ANSATTES NAVNE

function makeTable() {
    fetch('http://localhost:5000/employees', {mode:'cors'})
    .then(res => res.json())
    .then(data => {
        console.log(data);
        console.log(data.length);
        var col = [];
        for (var i = 0; i < data.length; i++) {
            for (var employee in data[i]) {
                console.log(employee);
                if (col.indexOf(employee) === -1) {
                    col.push(employee);
                    console.log(employee);
                }
            }
        }
    console.log(col); 
    var table = document.createElement("table");
    var tr = table.insertRow(-1);                   // TABLE ROW.
    for (var i = 0; i < col.length; i++) {
        var th = document.createElement("th");      // TABLE HEADER.
        th.innerHTML = col[i];
        tr.appendChild(th);
    }
    for (var i = 0; i < data.length; i++) {

        tr = table.insertRow(-1);

        for (var j = 0; j < col.length; j++) {
            var tabCell = tr.insertCell(-1);
            tabCell.innerHTML = data[i][col[j]];
        }
    }
    var divContainer = document.getElementById("employeeTable");
    divContainer.innerHTML = "";
    divContainer.appendChild(table);
    })
.catch(error => console.log('ERROR: ' + error));
}

function requestEmployee(event) {
    event.preventDefault();
    document.getElementById("requestEmployeeBtn").disabled=true; //prevent double submission
    var name = document.getElementById("employeeID").value;
    printStatus();
    console.log("TESTING" + name);

    jsonPost(document.getElementById("employeeRequest").action,name).then(evalStatus=>{
        console.log("Status="); console.log(evalStatus); //expect an date object. 
        document.getElementById("requestEmployeeBtn").disabled=false;
      }).catch(e=>console.log("Ooops "+e.message));
}

function printStatus() {
    document.getElementById("status").innerHTML = "Forespørgsel modtaget!";
} 

function jsonPost(url = "http://localhost:5000/employees", data={}){
    const options={
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
          'Content-Type': 'application/json'
        },
      body: JSON.stringify(data) // body data type must match "Content-Type" header
      };
    return fetch(url, {mode:'cors'},options).then(jsonParse);
  }

  function jsonParse(response){
    if(response.ok) 
       if(response.headers.get("Content-Type") === "application/json") 
         return response.json();
       else throw new Error("Wrong Content Type");   
   else 
      throw new Error("Non HTTP OK response");
  }
  