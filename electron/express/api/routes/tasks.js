var express = require('express');
var router = express.Router();
const Invoice = require("../../lib");
var root_path = __dirname.substring(0, __dirname.indexOf("\api"));
var renderedData="";
const db_name = "D:\\Sample.accdb";
const ADODB = require('node-adodb');
const connection = ADODB.open('Provider=Microsoft.ACE.OLEDB.12.0;Data Source='+db_name+';Persist Security Info=False;');




router.post('/previewpdf',function(req, res, next) {
    let invoiceModel = req.body;
    invoiceModel.igstApplicable = false;
      let templateUrl = "";
      let rowBlockUrl = "";
      
      if(invoiceModel.igstApplicable == false){
        templateUrl = "/example/template/index.html";
        rowBlockUrl = "/example/template/blocks/row.html";
      }
      
      // Create the new invoice
      let myInvoice = new Invoice({
          config: {
              template: root_path+""+ templateUrl
            , tableRowBlock: root_path+""+rowBlockUrl
          }
        , data: {
             invoice: invoiceModel
        }
      });
      
      // Render invoice as HTML and PDF
      myInvoice.toHtml(root_path+ "/angular/src/assets/my-invoice.html", (err, data) => {
        this.renderedData = data;
        res.json({'renderedData': this.renderedData});
    });
});


router.post('/saverenderpdf',function(req,res,next){
  let invoiceModel = req.body.invoice;
  let renderHtml =req.body.renderhtml;

  let invoice = new Invoice();
  invoice.toPdf(renderHtml,root_path+ "/angular/src/assets/my-invoice.pdf", (err, data) => {
 });
 
 let itemList = invoiceModel.itemList;
 let querystring = ";"

 connection
 .query('SELECT MAX(ID)+1 AS ID FROM [invoice_main]')
 .then(data => {
   JSON.stringify(data, null, 2);
   insert_billitems(data[0].ID,itemList,invoiceModel);
 })
 .catch(error => {
   console.error(error);
 });


 });
 


function insert_billitems(bill_id, itemList,invoiceModel) {

 let bill_total= 0;
  for (i = 0; i < itemList.length; i++) {
    bill_total += itemList[i].taxable + (itemList[i].taxable*itemList[i].taxslab/100);
    itemList[i].item_id = 1;//Change item_id below
    querystring = 'INSERT INTO bill_items(bill_id, item_id, rate, quantity, discount) VALUES ("' + bill_id + '", "' + itemList[i].item_id + '", ' + itemList[i].rate + ', ' + itemList[i].quantity + ', ' + itemList[i].discount + ')';
    
    connection
      .execute(querystring)
      .then(data => { })
      .catch(error => {
        console.error(error);
      });
  }
  
  console.log(invoiceModel);

 
  // let mainquery = 'INSERT INTO invoice_main(cust_name,GST,address,bill_date,bill_total,payment_terms,due_date,buyer_po,consignee_name,consignee_address,contract_no,contract_date,tax_payable,delivery_no,transport_provider,mode_of_trans,vehicle_num,lr_no,lr_date,lc_no,lc_date) VALUES ( "' + invoiceModel.company_name + '","' + invoiceModel.gst + '","' + invoiceModel.address + '","' + invoiceModel.date + '",' + bill_total + ', "' + invoiceModel.terms + '","' + invoiceModel.duedate + '","' + invoiceModel.po_num + '","' + invoiceModel.consignnee + '","' + invoiceModel.consignee_address + '","' + invoiceModel.contract_no + '","' + invoiceModel.contract_date + '",' + invoiceModel.taxreverse + ',"' + invoiceModel.delivery_no + '","' + invoiceModel.transporter + '","' + invoiceModel.transport_mode + '","' + invoiceModel.vehicle_num + '","' + invoiceModel.lr + '","' + invoiceModel.lr_date + '","' + invoiceModel.lc + '","' + invoiceModel.lc_date + '")';
  let mainquery = 'INSERT INTO invoice_main(cust_name,GST,address,bill_date,bill_total,payment_terms,due_date,buyer_po,consignee_name,consignee_address,contract_no,contract_date,tax_payable,delivery_no,transport_provider,mode_of_trans,vehicle_num,lr_no,lr_date,lc_no,lc_date) VALUES ( "' + invoiceModel.company_name + '","' + invoiceModel.gst + '","","' + invoiceModel.date + '",' + bill_total + ', "","","","","","","",0,"","","","","","","","")';
  console.log(mainquery);
  connection
    .execute(mainquery)
    .then(data => { })
    .catch(error => {
      console.error(error);
    });

}




module.exports =router;




