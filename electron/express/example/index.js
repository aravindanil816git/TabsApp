"use strict";

const Invoice = require("../lib");

let invoiceModel ={
  invoicenum : 255
  ,itemList:[
    {
      name: "Fabrication work at Tata Consultancies",
      sac: 1001,
      uom: "Kgs",
      quantity: 12,
      rate: 12000,
      total: 144000,
      discount: 10,
      taxable: 144856,
      taxslab: 18
    }
  ,     {
    name: "Fabrication work at XY  Flooring Company with Tech Client",
    sac: 1001,
    uom: "Kgs",
    quantity: 12,
    rate: 12000,
    total: 144000,
    discount: 10,
    taxable: 144856,
    taxslab: 18
  }

]
, date: "01/02/2014"
, company_name: "11/02/2014"
, explanation: "Thank you for your business!"
, po_num: "Another Company GmbH"
, taxId: "00000000"
, address: "The Street Name Some City Some Region 00000"
, consignee: "The Street Name Some City Some Region 00000"
, duedate: "11/02/2014"
, contract_no: "ABC123"
, contract_date: "11/02/2014"
, pan: "HHNP1234567"
, stateCode: "07"
, stateName: "Delhi"
, gst: "07HHNP1234567124"
, terms: ""
, delivery_no: ""
, transporter: ""
, transport_mode: ""
, vehicle_num: ""
, lr: ""
, lr_date: ""
, lc: ""
, lc_date: ""
,taxreverse: 125
,igstApplicable: false
}


let templateUrl = "";
let rowBlockUrl = "";

if(invoiceModel.igstApplicable == false){
  templateUrl = "/template/index.html"
  rowBlockUrl = "/template/blocks/row.html"
}

// Create the new invoice
let myInvoice = new Invoice({
    config: {
        template: __dirname + templateUrl
      , tableRowBlock: __dirname + rowBlockUrl
    }
  , data: 
     {
       invoice: invoiceModel
    }
});

// Render invoice as HTML and PDF
myInvoice.toHtml(__dirname + "/my-invoice.html", (err, data) => {})

myInvoice.toHtmltoPdf(__dirname + "/my-invoice.pdf", (err, data) => {
    console.log("Saved pdf file");
});

// Serve the pdf via streams (no files)
require("http").createServer((req, res) => {
    myInvoice.toPdf({ output: res });
}).listen(8000);
