// LOADING NECCESSARY LIBRARIERS
const fs = require("fs");
const http = require("http");

// NAME OF DATAFILES
const STAMDATA = "./Data/stamdata.csv";
const ABSENCEDATA = "./Data/absencedata.csv";
const WORKDATA = "./Data/workdata.csv";

// SYMBOLSKE KONSTANTER
const MILISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const LAST_DATE = ("2020-09-30");
const FIRSTNAME = true; // BRUGES TIL FUNKTIONEN READNAME
const LASTNAME = false; // BRUGES TIL FUNKTIONEN READNAME

// HER DEFINERES KLASSER TIL PROGRAMMET 
// KLASSEDEFINITIONERNE MANGLER AT LAVE FEJLMEDDELSER HVIS DATA IKKE PASSER TIL DET INPUT DER FORVENTES

// Denne klasse indeholder de ansatte
class Employee {
    constructor(id, name, cpr) {
        this._id = id;
        this._cpr = cpr;
        this.firstName = readName(name, FIRSTNAME);
        this.surname = readName(name, LASTNAME);
        this.gender = extractGender(cpr);
        this.birthDate = new Date(extractBirthDate(cpr));
        this.age = new Date().getFullYear() - this.birthDate.getFullYear(); 
    }
}

// Denne klasse indeholder ansættsesforhold
class Employment {
    constructor(id, jobTitle, jobType, team, startDate, endDate) {
        this._id = id;
        this.jobTitle = jobTitle;
        this.jobType = jobType;
        this.team = team;
        this.startDate = new Date(readDateString(startDate));
        this.endDate = new Date(readDateString(endDate));
        this.diffTime = this.endDate.getTime() - this.startDate.getTime();
        this.daysEmployed = (this.endDate.getTime() - this.startDate.getTime()) / MILISECONDS_PER_DAY;
    }
}

// Denne klasse indeholder fraværsepisoder
class AbsenceEpisode {
    constructor(id, absenceType, startDate, noOfHours) {
        this._id = id;
        this.absenceType = absenceType;
        this.startDate = new Date(readDateString(startDate));
        this.hoursAbsent = convertToFloat(noOfHours);
    }
}

// Denne klasse indeholder arbejdsdage
class WorkEpisode {
    constructor(id, workType, startDate, noOfHours) {
        this._id = id;
        this.workType = workType;
        this.startDate = new Date(readDateString(startDate));
        this.hoursWorked = convertToFloat(noOfHours);
    }
}

////////////////////////////////////////////////////////////////////////
// I DENNE SEKTION ER DER HJÆLPE-FUNKTIONER TIL INDLÆSNING AF DATA /////
////////////////////////////////////////////////////////////////////////

// DENNE FUNKTION INDLÆSER EN DATO FORMATERET SOM DD-MM-YYYY OG KONVERTERER DETTE TIL ET DATE-OBJEKT
// FUNKTIONEN ER IKKE KORREKT LIGE NU FORDI DEN TAGER HØJDE FOR SOMMERTID AUTOMATISK MEGA IRRITERENDE
function readDateString(dateString){
    if (validateDate(dateString)){
        let dateTemp = dateString.split("-");
        let dateObject = new Date(parseInt(dateTemp[2]),
                                  parseInt(dateTemp[1]) - 1,
                                  parseInt(dateTemp[0]), 2);
        return dateObject;
    // HVIS DER ER TALE OM PSEUDODATO SÆTTES DATOEN TIL LAST_DATE-KONSTANTEN
    } else if (isPseudoDate(dateString)) {
        let dateObject = new Date(LAST_DATE);
        return dateObject;
    } else {
//        throw new inputDataException(dateString);
    }
}

// Denne funktion undersøger om en tekstvariabel er en dato i et bestemt format
function validateDate(dateString){
    if (typeof dateString === 'string') {
        let dateTemp = dateString.split("-");
        if ((dateTemp[2] > '2022') || 
            (dateTemp[1] > '12'  ) || 
            (dateTemp[1] < '01'  ) ||
            (dateTemp[0] > '31'  ) ||
            (dateTemp[0] < '01'  )
        ) {
            return false
        } else {
            return true
        }  
    } else {
        return false
    }
}

// Denne funktion undersøger om tekstvariabelen er en pseudodato
function isPseudoDate(dateString) {
    if (dateString.substring(6,10) == '9999') {
        return true;
    }
    return false;
}

// Denne funktion undersøger om tekstvariablen er et cpr-nummer
function isCPR(cpr) {
    if ((cpr.length === 10) & !isNaN(parseFloat(cpr))) {
        return true;
    }
    return false;
}

/* Denne funktion indlæser en tekstvariabel med navne og returnerer
   enten fornavn eller efternavn alt efter typeOfName */
function readName(nameString, typeOfName){
    let re = /[, ]+/
    let nameTemp = nameString.split(re);
    if (typeOfName) {
        return nameTemp[1] // Returnerer et fornavn
    } else {
        return nameTemp[0] // Returnerer et efternavn
    }
}

// Denne funktion håndterer fejlmeddelelser 
// FUNKTIONEN ER IKKE FÆRDIG 
function inputDataException(value) {
    this.value = value;
    this.message = 'does not conform to the expected format for a date';
    this.toString = function() {
      return this.value + this.message;
    };
}

// Denne funktion udtrækker juridisk køn fra et cpr-nummer
// Returnerer værdien 0 hvis det er kvinde og 1 hvis mand
function extractGender(cpr) {
    if (isCPR(cpr)) {
        return cpr.substring(cpr.length - 1) % 2
    } else {
        throw new inputDataException(cpr)
    }
}

// Denne funktion udtrækker fødselsdato fra cpr-nummer og returnerer som date-object
function extractBirthDate(cpr) {
    if (isCPR(cpr)) {
        return new Date(parseInt(cpr.substring(4,6)),
                        parseInt(cpr.substring(2,4)) - 1,
                        parseInt(cpr.substring(0,2)))
    } else {
        throw new inputDataException(cpr)
    }
}

// Denne funktion konverter et dansk decimaltal til et engelsk decimaltal
function convertToFloat(stringNumber) {
    let tempNumber = stringNumber.replace(",", ".");
    return parseFloat(tempNumber);
}

// Denne funktion er ikke implementeret
// Funktionen skal bruges til at rydde op i den sektion der læser data ind
// Her er der mange gentagelser i koden som kan laves til en eller flere funktioner
function splitCSV(csvFILE) {
    data = csvFILE.split("\r\n");
    return data;
}

////////////////////////////////////////////////////
// I DENNE SEKTION LÆSES DATA IND I KLASSERNE  /////
////////////////////////////////////////////////////


/* HER LÆSES ALLE ANSATTE IND I EMPLOYEE-KLASSEN 
   OG ALLE FRAVÆRSEPISODER LÆSES IND I ABSENCEEPISODE-KLASSEN */
var employees = [];
var absences = [];
var data = fs.readFileSync(ABSENCEDATA, "utf-8");
data = data.split("\n");
data.splice(0,1); // Første linje i csv-filen indeholder variabelnavne som smides væk

// Alle linjer i CSV-filen løbes igennem og læses ind i de to klasser
// BLIVER DET FOR INDFORSTÅET MED REFERENCERNE TIL TEMP[O] OSV - OG HVILKET ALTERNATIV KUNNE DER VÆRE?
for (let i in data) {
    temp = data[i].split(";");
    // tjek om den ansatte allerede er at finde i array'et
    const employeeExists = employees.some(employee => employee._id === temp[0])
    if (!employeeExists) {
        employees.push(new Employee(temp[0],
                                    temp[1],
                                    temp[8]));
    }
    absences.push(new AbsenceEpisode(temp[0],
                                     temp[7],
                                     temp[2],
                                     temp[3]))
}

// HER LÆSES ALLE ANSÆTTELSESFORHOLD IND I EMPLOYMENT-KLASSEN
data = [];
let employments = [];
var data = fs.readFileSync(STAMDATA, "utf-8");
data = data.split("\n");
data.splice(0,1); // Første linje i csv-filen indeholder variabelnavne som smides væk

for (let i in data) {
    temp = data[i].split(";");
    employments.push(new Employment(temp[0],
                                        temp[2],
                                        temp[3],
                                        temp[4],
                                        temp[5],
                                        temp[6]))
}

// HER LÆSES ALLE ARBEJDAGE IND I WORK-EPISODE-KLASSEN
data = [];
let workdays = [];
var data = fs.readFileSync(WORKDATA, "utf-8");
data = data.split("\n"); // her splittes csv-filen til et array af observationer
data.splice(0,1); // Første linje i csv-filen indeholder variabelnavne som smides væk

/* her løbes array'et med data igennem og de relevante entries
   i array'et indlæses i WorkEpisode-objekter */
for (let i in data) {
    temp = data[i].split(";");
    workdays.push(new WorkEpisode(temp[0],  // id
                                      temp[6],  // arbejdstype
                                      temp[2],  // dato
                                      temp[9])) // antal arbejdstimer
}

/////////////////////////////////////////////////////////////////////////////////////////
// I DENNE SEKTION ER DER FUNKTIONER TIL AT OPARBEJDE STANDARDOPGØRELSER FOR FRAVÆR /////
/////////////////////////////////////////////////////////////////////////////////////////

// DENNE FUNKTION BEREGNER DET SAMLEDE ANTAL DAGE DE ANSATTE ER ANSAT DVS. ÅRSVÆRK
// DENNE FUNKTION BRUGES IKKE PT  
const totalDaysEmployed = employees.reduce((accumulator, object) => {
    return accumulator + object.daysEmployed;
}, 0);

/* Denne funktion undersøger et array af fraværsepisoder og returnerer et 
   array af entries med true for de entries som indikerer sygdom */
function isIllness(array) {
    if (array['absenceType'] == 'Illness') {
        return true
    } else {
        return false
    }
}

// Denne funktion beregner antallet af fraværsepisoder
function countAbsences(uniqueEmployeeArray, absencePeriodArray) {
    let totalAbsenceArray = [];
    for (emp of uniqueEmployeeArray) {
        let id = emp['_id'];
        let totalDaysAbsent = 0;
        for (absencePeriod of absencePeriodArray) {
            if (emp['_id'] == absencePeriod['_id']) {
                totalDaysAbsent++;

            }
        }
        totalAbsenceArray.push({id, totalDaysAbsent})
    }
    return totalAbsenceArray;
}

/* Denne funktion modtager et array af episoder, samt to datoer og returnerer
   et array af episoder indenfor dette interval */
function filterByDates(array, date1, date2) {
    let startDate = readDateString(date1);
    let endDate = readDateString(date2);
    let result = array.filter(data => {
      return (
        new Date(data.startDate).getTime() >= new Date(startDate).getTime() &&
        new Date(data.startDate).getTime() <= new Date(endDate).getTime()
      )
    })
    return result
}

// SIDSTE DEL ER NOGLE TESTS AF KODEN INDTIL NU
testarray = filterByDates(absences, "01-01-2020", "30-04-2020");
console.log(testarray);
console.log(testarray.length);
console.log(countAbsences(employees, testarray));

let onlyIllnessAbsence = testarray.filter(isIllness);
console.log(onlyIllnessAbsence);
console.log(onlyIllnessAbsence.length);
console.log(countAbsences(employees, onlyIllnessAbsence));

// DENNE FUNKTION BEREGNER DET SAMLEDE ANTAL EPISODER AF FRAVÆR I EN BESTEMT PERIODE

// DENNE FUNKTION BEREGNER FRAVÆRSPROCENTEN

// DENNE FUNKTION BEREGNER BRADFORD-FAKTOREN


///////////////////////////////////////////////////////////////////////
// I DENNE SEKTION ER DER FUNKTIONER TIL AT SÆTTE API-SERVEREN OP /////
///////////////////////////////////////////////////////////////////////


// DENNE DEL AF KODEN INDEHOLDER API'EN

const port = process.env.PORT || 5000;

http
    .createServer((req, res) => {
    res.writeHead(200, {"Content-Type": "text/html"});
       
    // Her implementeres de forskellige endpoints i API'en
    const url = req.url;
    // Her gøres JSON med alle ansatte tilgængelig
    if (url === "/employees") {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(employees));
        res.end();
    // Dette er standardbeskeden på api'en
    } else {
        res.write('<h1>Dette er en test</h1>');
        res.end();
    }

})  .listen(port, () => {
    console.log(`Server is listening on port ${port}...`);
})


