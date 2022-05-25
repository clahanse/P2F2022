//   LOADING NECCESSARY LIBRARIERS */
const fs = require("fs");
const http = require("http");
const internal = require("stream");

// NAME OF DATAFILES */
const STAMDATA = "./Data/stamdata.csv";
const ABSENCEDATA = "./Data/absencedata.csv";
const WORKDATA = "./Data/workdata.csv";

// SYMBOLSKE KONSTANTER */
const MILISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const LAST_DATE = ("2020-09-30");
const FIRSTNAME = true; // BRUGES TIL FUNKTIONEN READNAME
const LASTNAME = false; // BRUGES TIL FUNKTIONEN READNAME
const LOWESTAGE = 18;
const HIGHESTAGE = 70;
const WOMEN = 0;
const MEN = 1;
const BOTH = 2;
const ALL = 1;

// GLOBALE VARIABLE OG ARRAYS
let employees = [];
let absences = [];
let employments = [];
let workepisodes = [];


// HER DEFINERES KLASSER TIL PROGRAMMET 

/**  Denne klasse indeholder de ansatte 
 * @constructor
 * @param {string} id id for den ansatte 
 * @param {string}  name navn på den ansatte
 * @param {string}  cpr cprnummer for den ansatte 
*/

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

/** Denne klasse indeholder ansættsesforhold
 * @constructor
 * @param {string} id id for den ansatte 
 * @param {string} jobTitle titel på jobbet for ansættelsesforholdet 
 * @param {string} jobType angiver om ansættelseforholdet er whitecollar eller bluecollar  
 * @param {string} team angiver den arbejdsenhed ansættelsesforholdet er under 
 * @param {string} startDate startdato for ansættelsesforholdet 
 * @param {string} endDate slutdato for ansættelsesforholdet  
 */

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

/**  Denne klasse indeholder fraværsepisoder 
 * @constructor
 * @param {string} id id for den ansatte 
 * @param {string} absenceType type af fravær  
 * @param {string} startDate startdato for fraværsepisoden 
 * @param {string} hoursAbsent antal timer med fravær for episoden  
*/
class AbsenceEpisode {
    constructor(id, absenceType, startDate, noOfHours) {
        this._id = id;
        this.absenceType = absenceType;
        this.startDate = new Date(readDateString(startDate));
        this.hoursAbsent = convertToFloat(noOfHours);
    }
}

/**  Denne klasse indeholder arbejdsdage 
 * @constructor
 * @param {string} id id for den ansatte 
 * @param {string} workType type af arbejdsvagt  
 * @param {string} startDate dato for arbejdsepisoden 
 * @param {string} hoursWorked antal timer på arbejde  
*/
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

// 
/**
 * DENNE FUNKTION INDLÆSER EN DATO I TEKSTFORMAT OG KONVERTERER DETTE TIL ET DATE-OBJEKT
 * @param {*} dateString funktionen skal kaldes med en tekststreng der er formateret som DD-MM-YYYY 
 * @returns {Date} funktionen returnerer et Date-objekt
 */
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

/**
 * Denne funktion undersøger om en tekstvariabel er en dato i et bestemt format
 * @param {*} dateString tekstvariabel der skal undersøges om er en dato i formatet DD-MM-YYYY
 * @returns {boolean} returnerer sand/falsk
 */

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

/**
 * Denne funktion undersøger om tekstvariabelen er en pseudodato
 * @param {*} dateString tekststreng med dato der undersøges om er en pseudodato hvor årstal = 9999
 * @returns {boolean} returnerer sand/falsk
 */

function isPseudoDate(dateString) {
    if (dateString.substring(6,10) == '9999') {
        return true;
    }
    return false;
}

/**
 * Denne funktion undersøger om tekstvariablen er et cpr-nummer
 * @param {string} cpr en tekststreng der undersøges om input er et cpr-nummer
 * @returns {boolean} returnerer sand/falsk
 */

function isCPR(cpr) {
    if ((cpr.length === 10) & !isNaN(parseFloat(cpr))) {
        return true;
    }
    return false;
}

/* */

/**
 * Denne funktion indlæser en tekstvariabel med navne og returnerer
   enten fornavn eller efternavn alt efter typeOfName 
 * @param {*} nameString en tekstreng med et navn i formatet Efternavn, Fornavn Mellemnavn
 * @param {*} typeOfName indikator på om der skal returneres fornavn [1] eller efternavn [0]
 * @returns {string} returnerer enten fornavn eller efternavn
 */
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


/**
 * Denne funktion udtrækker juridisk køn fra et cpr-nummer
 * @param {*} cpr funktionen modtager et cpr-nummer
 * @returns {number} Returnerer værdien 0 hvis det er kvinde og 1 hvis mand
 */
function extractGender(cpr) {
    if (isCPR(cpr)) {
        return cpr.substring(cpr.length - 1) % 2
    } else {
        throw new inputDataException(cpr)
    }
}

/**
 * Denne funktion udtrækker fødselsdato fra cpr-nummer og returnerer som date-object
 * @param {*} cpr funktionen modtager et cpr-nummer
 * @returns {Date} funktionen returnerer et Date-object med fødselsdatoen
 */
function extractBirthDate(cpr) {
    if (isCPR(cpr)) {
        return new Date(parseInt(cpr.substring(4,6)),
                        parseInt(cpr.substring(2,4)) - 1,
                        parseInt(cpr.substring(0,2)))
    } else {
        throw new inputDataException(cpr)
    }
}

// 
/**
 * Denne funktion konverter et dansk decimaltal til et engelsk decimaltal
 * @param {*} stringNumber et dansk decimaltal med komma
 * @returns {number} et engelsk decimaltal med punktum
 */
function convertToFloat(stringNumber) {
    let tempNumber = stringNumber.replace(",", ".");
    return parseFloat(tempNumber);
}


////////////////////////////////////////////////////
// I DENNE SEKTION LÆSES DATA IND I KLASSERNE  /////
////////////////////////////////////////////////////


/* HER LÆSES ALLE ANSATTE IND I EMPLOYEE-KLASSEN 
   OG ALLE FRAVÆRSEPISODER LÆSES IND I ABSENCEEPISODE-KLASSEN */
/**
 * Denne funktion læser alle ansatte ind i Employee-klassen
 * Ligeledes læses alle fraværsepisoder ind i AbsenceEpisode-klassen
 * Dette gøres i samme funktion for ikke at læse den samme fil flere gange
 * @returns {array} returnerer et array bestående af to arrays af objekter
 */
function getEmployees() {
    var employees = [];
    var absences = [];
    var data = fs.readFileSync(ABSENCEDATA, "utf-8");
    data = data.split("\n");
    data.splice(0,1); // Første linje i csv-filen indeholder variabelnavne som smides væk

// Alle linjer i CSV-filen løbes igennem og læses ind i de to klasser
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
    return [employees, absences];
}

// HER OPDDELES DE TO ARRAYS I HVER SIT ARRAY AF HHV. ANSASTTE OG FRAVÆRSEPISODER
let employeeAbsences = getEmployees();
employees = employeeAbsences[0];
absences = employeeAbsences[1];




/**
 * HER LÆSES ALLE ANSÆTTELSESFORHOLD IND I EMPLOYMENT-KLASSEN
 * @returns {array} returnerer et array af Employment-objekter
 */
function getEmployments() {

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
    return employments;
}

employments = getEmployments();


/**
 * HER LÆSES ALLE ARBEJDAGE IND I WORK-EPISODE-KLASSEN
 * @returns {array} returnerer et array af WorkEpisode-objekter
 */
function getWorkEpisodes() {
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
    return workdays;
}

workepisodes = getWorkEpisodes();

/////////////////////////////////////////////////////////////////////////////////////////
// I DENNE SEKTION ER DER FUNKTIONER TIL AT OPARBEJDE STANDARDOPGØRELSER FOR FRAVÆR /////
/////////////////////////////////////////////////////////////////////////////////////////



/**
 * Denne funktion undersøger et array af fraværsepisoder og returnerer et 
 * array af entries med true for de entries som indikerer sygdom 
 * @param {array} array funktionen modtager et array af AbsenceEpisode-objekter 
 * @returns {array} funktionen returnerer et array af booleans der bruges i JS filter metode
 */
   function isIllness(array) {
    if (array['absenceType'] == 'Illness') {
        return true
    } else {
        return false
    }
}


/**
 * Denne funktion beregner antallet af fraværsdage
 * @param {array} employeeArray et array af Employee-objekter
 * @param {array} absencePeriodArray et array af AbsenceEpisode-objekter
 * @returns {array} funktionen returnerer et array af objekter med et EmployeeId og antal fraværsdage i arrayet
 */
 function countAbsenceDays(employeeArray, absencePeriodArray) {
    let totalAbsenceArray = [];
    let illnessArray = absencePeriodArray.filter(data => {
        return (isIllness(data))
    })
    for (emp of employeeArray) {
        let id = emp['_id'];
        let totalDaysAbsent = 0;
        for (absencePeriod of illnessArray) {
            if (emp['_id'] == absencePeriod['_id']) {
                totalDaysAbsent++;
            }
        }
        totalAbsenceArray.push({id, totalDaysAbsent})
    }
    return totalAbsenceArray;
}


/*  */
/**
 * Denne funktion modtager et array af episoder, samt to datoer og returnerer
 * et array af episoder indenfor dette interval
 * @param {array} array et array af enten AbsenceEpisode-objekter eller WorkEpisode-objekter
 * @param {string} date1 en tekststreng med en dato i format DD-MM-YY
 * @param {string} date2 en tekststreng med en dato i format DD-MM-YY
 * @returns {array} et array af episoder mellem de to datoer
 */
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

// DENNE FUNKTION BEREGNER DET SAMLEDE ANTAL EPISODER AF FRAVÆR I EN BESTEMT PERIODE
// FUNKTIONEN MANGLER

// DENNE FUNKTION BEREGNER FRAVÆRSPROCENTEN
// FUNKTIONEN MANGLER

// DENNE FUNKTION BEREGNER BRADFORD-FAKTOREN
// FUNKTIONEN MANGLER

/**
 * FUNKTION TIL AT FREMSØGE ANSATTE MED BESTEMTE KARAKTERISTIKA
 * @param {array} employeeArray et array af Employee-objekter
 * @param {string} id en tekststreng med et employeeID
 * @param {number} ageLow den nedre aldersgrænse for de ansatte der skal returneres
 * @param {number} ageHigh den øvre aldersgrænse for de ansatte der skal returneres
 * @param {number} gender indikator på om der skal filtreres på køn
 * @returns {array} returnerer et array af ansatte der opfylder søgekriterierne eller én enkelt ansat hvis ID er specificeret
 */
function getEmployee(employeeArray, id = ALL, ageLow = LOWESTAGE, ageHigh = HIGHESTAGE, gender = BOTH) {
    let tempArray = [];
    if (id == ALL) {
        // HER SORTERES PÅ BAGGRUND AF ALDER
        tempArray.push(employeeArray.filter(data => {
            data.age >= ageLow && data.age <= ageHigh
        }))
        if (gender == BOTH) {
            return tempArray
        } else if (gender == WOMEN) {
            return tempArray.filter(data => data.gender == WOMEN)
        } else {
            return tempArray.filter(data => data.gender == MEN)
        }
    } else {
        return employeeArray.find(element => element._id == id)
    }
}


///////////////////////////////////////////////////////////////////////
// I DENNE SEKTION ER DER FUNKTIONER TIL AT SÆTTE API-SERVEREN OP /////
///////////////////////////////////////////////////////////////////////


// DENNE DEL AF KODEN INDEHOLDER API'EN



const port = process.env.PORT || 5000;

http
    .createServer((req, res) => {
    console.log("GOT: " + req.method + " " +req.url);
    res.writeHead(200, {"Content-Type": "text/html",
                        "Access-Control-Allow-Headers": "*",
                        "Access-Control-Allow-Origin" : "*", 
                        "Access-Control-Allow-Methods" : "PUT, GET, OPTIONS"});

    if (req.method == 'GET') {
        console.log(req.method);
        // Her implementeres de forskellige endpoints i API'en
        const url = req.url;
        // Her gøres JSON med alle ansatte tilgængelig
        let employeeId = url.match(/\d+/);
        console.log(url);
        switch (url) {
            case "/employees":
                res.writeHead(200, {"Access-Control-Allow-Origin": "*",
                                    "Content-Type": "application/json"});
                res.write(JSON.stringify(employees));
                res.end();
                break;
            case `/employees/${employeeId}`:
                let employeeReturn = getEmployee(employees, employeeId);
                if (employeeReturn != undefined) {
                    res.writeHead(200, {"Access-Control-Allow-Origin": "*",
                                        "Content-Type": "application/json"});
                    res.write(JSON.stringify(getEmployee(employees, employeeId)));
                    res.end();
                } else {
                    res.writeHead(404);
                    res.end(JSON.stringify({error:"No employee by that Id"}));                
                }
                break;
            default:
                res.writeHead(404);
                res.end(JSON.stringify({error:"Resource not found"}));
        }    

    // DENNE DEL AF KODEN FUNGERER IKKE EFTER HENSIGTEN
    } else if (req.method == 'POST') {
        console.log(req.method);
        // Her implementeres de forskellige endpoints i API'en
        const url = req.url;
        // Her gøres JSON med alle ansatte tilgængelig
        let employeeId = url.match(/\d+/);
        console.log(url);
        console.log(req.body);
        switch (url) {
            case "/employees":
                res.writeHead(200, {"Access-Control-Allow-Origin": "*",
                                    "Content-Type": "application/json"});
                res.write(JSON.stringify(employees));
                res.end();
                break;
        }
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({error:"Resource not found"}));
    }
})  .listen(port, () => {
    console.log(`Server is listening on port ${port}...`);
})


