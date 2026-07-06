const xlsx = require('xlsx');
const path = require('path');

const inputPath = "C:/Users/Kobi Kolay/Desktop/ANVR_Seyahat_Acenteleri.xlsx";
const outputPath = "C:/Users/Kobi Kolay/Desktop/Kobikolay_CRM_Import_Hollanda.xlsx";

const workbook = xlsx.readFile(inputPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet);

const newData = data.map(row => {
    return {
        "Firma": row["Firma Adı"] || "",
        "E-posta": row["E-posta"] || "",
        "Telefon": row["Telefon"] || "",
        "BTK": "Hollanda"
    };
});

const newSheet = xlsx.utils.json_to_sheet(newData);
const newWorkbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(newWorkbook, newSheet, "Acenteler");

xlsx.writeFile(newWorkbook, outputPath);
console.log(`Successfully created ${outputPath} with ${newData.length} rows.`);
