"use strict";

const fs = require("fs")
    , readFile = require("read-utf8")
    , mustache = require("mustache")
    , sameTime = require("same-time")
    , oneByOne = require("one-by-one")
    , iterateObject = require("iterate-object")
    , noop = require("noop6")
    , EventEmitter = require("events").EventEmitter
    , ul = require("ul")
    , htmlPdf = require("phantom-html-to-pdf")({ phantomPath: require("phantomjs-prebuilt").path })
    , isStream = require("is-stream")
    ;

var html = "";
/**
 * Invoice
 * This is the constructor that creates a new instance containing the needed
 * methods.
 *
 * @name Invoice
 * @function
 * @param {Object} options The options for creating the new invoice:
 *
 *  - `config` (Object):
 *    - `template` (String): The HTML root template.
 *  - `data` (Object):
 *    - `currencyBalance` (Object):
 *      - `main` (Number): The main balance.
 *      - `secondary` (Number): The converted main balance.
 *      - `tasks` (Array): An array with the tasks (description of the services you did).
 *      - `invoice` (Object): Information about invoice.
 *  - `seller` (Object): Information about seller.
 *  - `buyer` (Object): Information about buyer.
 */
module.exports = class PDFrender {

    
    constructor (options) {
        this.options = options;
        this.templates = {};
    }

    /**
     * initTemplates
     * Inits the HTML templates.
     *
     * @name initTemplates
     * @function
     * @param {Function} callback The callback function.
     */
    initTemplates (callback) {
        if (this.templates.root === undefined || this.templates.tableRowBlock === undefined) {
            sameTime([
                cb => readFile(this.options.config.template, cb)
              , cb => readFile(this.options.config.tableRowBlock, cb)
            ], (err, data) => {
                if (err) { return callback(err); }
                this.templates.root = data[0];
                this.templates.tableRowBlock = data[1];
                callback(null, this.templates);
            });
        } else {
            return callback(null, this.templates);
        }
    }

    /**
     * toHtml
     * Renders the invoice in HTML format.
     *
     * @name toHtml
     * @function
     * @param {String} output An optional path to the output file.
     * @param {Function} callback The callback function.
     * @return {Invoice} The `Nodeice` instance.
     */
    toHtml (output, callback) {

        if (typeof output === "function") {
            callback = output;
            output = null;
        }

        let igstApplicable = false;

        

        let options = this.options.data.invoice
          , tasks = options.itemList
          , invoiceHtml = ""
          , invoiceData = {
                invoice: options
              , rendered_rows: ""
              , total: {
                    taxable: 0
                  , sgst: 0
                  , cgst: 0
                  , nettotal: 0
                  ,nettotal_words: ""
                }
            }
          ;

          


          if(invoiceData.invoice.igstApplicable == true){
            igstApplicable = true;   
        }
        this.initTemplates((err, templates) => {
            if (err) { console.log(err);return callback(err); 
            }
            
            iterateObject(tasks, (cTask, i) => {
                // Set the additional fields and compute data
                cTask.slnum = i + 1;

                if (typeof cTask.taxslab === "number" && !igstApplicable) {
                    // Set the unit price of this row  
                    cTask.cgst = parseFloat((cTask.taxable * (cTask.taxslab / 2 ) /100)).toFixed(2);
                    cTask.sgst = parseFloat((cTask.taxable * (cTask.taxslab / 2 ) /100)).toFixed(2);
                }
                else{
                    cTask.igst = (cTask.taxable * (cTask.taxslab ) /100).toFixed(2);
                }



                // Sum the amount to the total
                if(!igstApplicable)
                {
                    invoiceData.total.cgst += cTask.cgst;
                    invoiceData.total.sgst += cTask.sgst;
                }
                else
                    invoiceData.total.igst += cTask.igst;
                    invoiceData.total.taxable += cTask.taxable;

                    invoiceData.total.nettotal += cTask.taxable + (cTask.taxable*cTask.taxslab /100)
                // Render HTML for the current row
                invoiceData.rendered_rows += mustache.render(
                    templates.tableRowBlock, cTask
                );
            });

            // Set the total
            if(!igstApplicable)
            {
                invoiceData.total.cgst  = parseFloat(invoiceData.total.cgst).toFixed(2);
                invoiceData.total.sgst = parseFloat(invoiceData.total.sgst).toFixed(2);
            }
            else
                invoiceData.total.igst  = parseFloat(invoiceData.total.igst).toFixed(2);

            invoiceData.total.nettotal  = Math.floor(invoiceData.total.nettotal);
            invoiceData.total.nettotal_words = this.convertNumberToWords(invoiceData.total.nettotal);

            // Render the invoice HTML fields
            invoiceHtml = mustache.render(templates.root, invoiceData);
            
            this.htmlout = invoiceHtml;
            module.exports.html = invoiceHtml;
            exports.renderData = invoiceHtml;
            // Output file
            if (typeof output === "string") {
                fs.writeFile(output, invoiceHtml, err => {
                    callback(err, invoiceHtml);
                });
                return this;
            }

            // Callback the data
            callback(null, invoiceHtml);
        });
        
        return this;
    }

    getHtml(){
        return html;
    }
    /**
     * toPdf
     * Renders invoice as pdf
     *
     * @name toPdf
     * @function
     * @param {Object|String|Stream} options The path the output pdf file, the
     * stream object, or an object containing:
     *
     *  - `output` (String|Stream): The path to the output file or the stream object.
     *  - `converter` (Object): An object containing custom settings for the [`phantom-html-to-pdf`](https://github.com/pofider/phantom-html-to-pdf).
     *
     * @param {Function} callback The callback function
     * @return {Invoice} The Invoice instance
     */
    toPdf (renderHtml, ops, callback) {

        let ev = new EventEmitter()
          , opsIsStream = isStream(ops)
          , noStream = false
          ;

        callback = callback || noop;
        if (typeof ops === "function") {
            callback = ops;
            ops = {};
        }


        if (typeof ops === "string" || opsIsStream) {
            ops = { output: ops };
        }

        if (!opsIsStream && typeof ops.output === "string") {
            ops.output = fs.createWriteStream(ops.output);
        }

        noStream = !isStream(ops.output);

        ops = ul.deepMerge(ops, {
            converter: {
                viewportSize: {
                    width: 2480
                  , height: 3508
                },
                paperSize: {
                    format: "A3"
                }
            }
        });
        ops.converter.html = renderHtml;

        oneByOne([
           (next) => {
                htmlPdf(ops.converter, next);
            }
          , (next, pdf) => {

                if (noStream) {
                    return next(null, pdf);
                }

                let err = [];
                ops.output.on("error", err => err.push(err));
                pdf.stream.on("end", () => {
                    if (err.length) {
                        return next(err.length === 1 ? err[0] : err);
                    }
                    next(null, pdf);
                });
                pdf.stream.pipe(ops.output);
            }
        ], (err, data) => {
            callback(err, data[1], data[0]);
        });
    }


    convertNumberToWords(amount) {
        var words = new Array();
        words[0] = '';
        words[1] = 'One';
        words[2] = 'Two';
        words[3] = 'Three';
        words[4] = 'Four';
        words[5] = 'Five';
        words[6] = 'Six';
        words[7] = 'Seven';
        words[8] = 'Eight';
        words[9] = 'Nine';
        words[10] = 'Ten';
        words[11] = 'Eleven';
        words[12] = 'Twelve';
        words[13] = 'Thirteen';
        words[14] = 'Fourteen';
        words[15] = 'Fifteen';
        words[16] = 'Sixteen';
        words[17] = 'Seventeen';
        words[18] = 'Eighteen';
        words[19] = 'Nineteen';
        words[20] = 'Twenty';
        words[30] = 'Thirty';
        words[40] = 'Forty';
        words[50] = 'Fifty';
        words[60] = 'Sixty';
        words[70] = 'Seventy';
        words[80] = 'Eighty';
        words[90] = 'Ninety';
        amount = amount.toString();
        var atemp = amount.split(".");
        var number = atemp[0].split(",").join("");
        var n_length = number.length;
        var words_string = "";
        if (n_length <= 9) {
            var n_array = new Array(0, 0, 0, 0, 0, 0, 0, 0, 0);
            var received_n_array = new Array();
            for (var i = 0; i < n_length; i++) {
                received_n_array[i] = number.substr(i, 1);
            }
            for (var i = 9 - n_length, j = 0; i < 9; i++, j++) {
                n_array[i] = received_n_array[j];
            }
            for (var i = 0, j = 1; i < 9; i++, j++) {
                if (i == 0 || i == 2 || i == 4 || i == 7) {
                    if (n_array[i] == 1) {
                        n_array[j] = 10 + parseInt(n_array[j]);
                        n_array[i] = 0;
                    }
                }
            }
            var value = "";
            for (var i = 0; i < 9; i++) {
                if (i == 0 || i == 2 || i == 4 || i == 7) {
                    value = n_array[i] * 10;
                } else {
                    value = n_array[i];
                }
                if (value != 0) {
                    words_string += words[value] + " ";
                }
                if ((i == 1 && value != 0) || (i == 0 && value != 0 && n_array[i + 1] == 0)) {
                    words_string += "Crores ";
                }
                if ((i == 3 && value != 0) || (i == 2 && value != 0 && n_array[i + 1] == 0)) {
                    words_string += "Lakhs ";
                }
                if ((i == 5 && value != 0) || (i == 4 && value != 0 && n_array[i + 1] == 0)) {
                    words_string += "Thousand ";
                }
                if (i == 6 && value != 0 && (n_array[i + 1] != 0 && n_array[i + 2] != 0)) {
                    words_string += "Hundred and ";
                } else if (i == 6 && value != 0) {
                    words_string += "Hundred ";
                }
            }
            words_string = words_string.split("  ").join(" ");
        }
        return words_string;
    }
};
