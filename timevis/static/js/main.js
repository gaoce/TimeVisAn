// Set cookie
function setCookie(cname, cvalue) {
 	var exdays = 1;
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires;
}

// Get cookie
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1);
        if (c.indexOf(name) == 0) return c.substring(name.length,c.length);
    }
    return "";
}

// ========================================================================
// viewModel class
// ========================================================================
function viewModel(){
    var self = this;

    // ========================================================================
    // Controls subpage
    // ========================================================================
    // | Section  | Option  |  Function |  Comment  |
    // | -------- | ------- | --------- | --------- |
    // | design   |  exp    |           |           |
    // |          |  lay    |           |           |
    // |          |  imp    |  imp_file |           |
    // |          |         |  imp_manu |           |
    // | vis      |  plate  |           |           |
    // |          |  genes  |           |           |
    // | analysis |  norm   |           |           |
    // |          |  expt   |           |           |
    //
    self.sec = ko.observable('design');  // Active section

    var opt = getCookie('opt');
    if (opt) {
        self.opt = ko.observable(opt);
    } else {
        self.opt = ko.observable('exp');     // Active option
    }
    self.opt.subscribe(function (newOpt){ setCookie('opt', newOpt)})

    // TODO: implement this at option level
    var fun = getCookie('fun');
    if (fun) {
        self.fun = ko.observable(fun);
    } else {
        self.fun = ko.observable('exp');     // Active funion
    }
    self.fun.subscribe(function (newFun){ setCookie('fun', newFun)})

    // Experiment subpage
    self.exp = new ExpVM();

    // Layout subpage
    self.layout = new LayoutVM();
    self.layouts = [];

    // Experiment subpage
    self.gene = new GeneVM();

    // ========================================================================
    // Plates
    // ========================================================================

    // Visualize plate
    self.vis_plate = ko.observable(false);


    // ========================================================================
    // Genes Vis: Time series curve vis
    // ========================================================================
    // vis row
    self.row = ko.observableArray([ ['a', 'b'], ['c', 'd'] ]);

}

// =====================
// Experiment View Model
// =====================
function ExpVM() {
    var self = this;

    // API URL
    self.url = "/api/v2/experiment";

    // Observable array of experiment objs and current one displayed on the page
    self.experiments = ko.observableArray();
    self.current_exp = ko.observable();

    // Retrieve exp objs through API
    self.get_exp = function() {
        $.ajax({
            url: self.url,
            type: "GET",
            success: function(data) {
                // Populate experiments with retrieved experiment objs
                self.experiments.removeAll();
                exps = data.experiment;
                $.map(exps, function(exp){
                    self.experiments.push(
                        new Exp(exp.id, exp.name, exp.user, exp.well,
                            exp.factors, exp.channels)
                    );
                });
                // Add empty experiment in the front
                self.experiments.unshift(new Exp(0, '', null, null, [], [],
                        'Add New Experiment'));

                // By default, current_exp is empty
                self.current_exp(self.experiments()[0]);
            }
        });
    };
    self.get_exp();

    // Flash information on the page
    self.flash = function(msg) {
        $("#exp-notice").html(msg).show().delay(2000).fadeOut();
    }

    // Validate input fields, incl. experiment names, factors and channels
    self.validate = function() {
        // Check if there is an experiment name
        if (self.current_exp().name() === ''){
            self.flash('Error: invalid experiment name!');
            return 0;
        }

        // Validate Factors
        if (self.current_exp().factors().length === 0) {
            self.flash('Error: no factors available!');
            return 0;
        }

        // Check factor name and type availability
        for (var i in self.current_exp().factors()){
            var f = self.current_exp().factors()[i];
            if (f.name() === '' || !f.type()){
                self.flash('Error: invalid Factors!');
                return 0;
            }
        }

        // Validate Channels
        if (self.current_exp().channels().length === 0) {
            self.flash('Error: no channels available!');
            return 0;
        }

        // Check channel name and type availability
        for (var i in self.current_exp().channels()){
            var c = self.current_exp().channels()[i];
            if (c.name() === ''){
                self.flash('Error: invalid Channels!');
                return 0;
            }
        }
    }

    // POST (if id=0) or PUT current_exp thru API
    self.update_exp = function() {
        if (self.validate() === 0){ return };

        // HTTP method
        var method;
        if (self.current_exp().id === 0) {
            method = "POST";
        } else {
            method = "PUT";
        }

        // Send to server
        $.ajax({
            url: self.url,
            type: method,
            dataType: "json",
            data: JSON.stringify({experiment: [ko.toJS(self.current_exp())]}),
            contentType: "application/json; charset=utf-8",
            success: function(data){
                exp = data.experiment[0];
                self.experiments.push(
                    new Exp(exp.id, exp.name, exp.user, exp.well, exp.factors,
                        exp.channels)
                );
                self.experiments.remove(self.current_exp());
                if (method === "POST"){
                    self.experiments.unshift(new Exp(0, '', null, null, [], [],
                            'Add New Experiment'));
                }
                self.current_exp(self.experiments.slice(-1)[0]);
                self.flash('Succeed!');
            },
            error: function(data){
                self.flash('Failed! '+ $.parseJSON(data.responseText)['Error']);
            }
        });
    };
}

// =================
// Layout View Model
// =================
function LayoutVM() {
    var self = this;

    self.exp_url = '/api/v2/experiment';
    self.layout_url = '/api/v2/layout';

    // Factor (independent variables)
    self.experiments = ko.observableArray();
    self.current_exp = ko.observable();

    self.layouts = ko.observableArray();
    self.current_layout = ko.observable();

    self.factors = ko.observableArray();
    self.current_factor = ko.observable();

	self.get_exps = function() {
        $.ajax({
            url: self.exp_url,
            type: "GET",
            success: function(data) {
                // Populate experiments with retrieved experiment objs
                exps = data.experiment;
                $.map(exps, function(exp){
                    self.experiments.push(
                        new Exp(exp.id, exp.name, exp.user, exp.well,
                            exp.factors, exp.channels)
                    );
                });
            }
        });
    };

	self.get_layouts = function(eid) {
	    $.ajax({
	        url: self.layout_url + '?eid=' + eid,
	        type: "GET",
	        success: function(data) {
	            layouts = data.layout;
                self.layouts.removeAll();
	            $.map(layouts, function(layout){
	                var layout_obj = new Layout(layout.id, layout.name);
	                $.map(layout.factors, function(factor){
	                    layout_obj.factors.push(new Factor(factor.id, 
                                factor.name, '', factor.levels));
	                });
	                self.layouts.push(layout_obj);
	            });

                // Create a place holder layout for adding new
                var factors = $.map(layouts[0].factors, function(f) {
                    var factor = new Factor(f.id, f.name, '', f.levels);
                    $.map(factor.levels(), function(lvl){
                        lvl.name = '';
                        lvl.value = null;
                    });
                    return factor;
                })

                var empty_layout = new Layout(0, '', 'Add New Layout');
                empty_layout.factors(factors);
                self.layouts.unshift(empty_layout);
	        }
	    });
	}

    self.get_exps(self.experiments);

    self.container = $('#layout')[0];
    self.table;
    self.current_exp.subscribe(function(exp){
        self.get_layouts(exp.id);
        var settings = new createSetting(exp.well());
        self.table = new Handsontable(self.container, settings);
    });

    self.current_layout.subscribe(function(layout){
        self.factors(layout.factors());
    });

    self.encodeData = function(levels) {
        var lvls = $.map(levels, function(level){return level.value;});
        var ret = [];
        switch (lvls.length) {
            case 96:
                var nCol = 12;
                break;
            case 384:
                var nCol = 24;
                break;
            default:
                return;
        }
        var cur_arr = [];
        $.map(lvls, function(lvl, ind) {
            cur_arr.push(lvl);
            if ((ind + 1) % nCol === 0) {
                ret.push(cur_arr);
                cur_arr = [];
            }
        });

        return ret;
    };

    self.decodeData = function(data) {
        var lvls = [];
        $.map(data, function(arr){
            $.map(arr, function(d){
                lvls.push(d);
            });
        });
        switch (lvls.length) {
            case 96:
                var nRow = 8;
                var nCol = 12;
                break;
            case 384:
                var nRow = 16;
                var nCol = 24;
                break;
            default:
                return;
        }

        var ret = {};
        $.map(lvls, function(lvl, ind) {
            // 1-based row and col num
            var col = ind % nCol + 1;
            var row = (ind - col + 1) / nCol + 1;
    		var well = String.fromCharCode(64 + row) + (col < 10 ? '0' : '') + col;
            ret[well] = '' + lvl;
        })

        return ret;
    }

    self.current_factor.subscribe(function(factor){
        var lvls = self.encodeData(factor.levels());
        self.table.loadData(lvls);
    });

    self.update_layout = function() {
        var data = self.decodeData(self.table.getData());
        var layout = ko.toJS(self.current_layout);
        var factor ={id: self.current_factor().id, 
            		name: self.current_factor().name(), 
                    levels: data};
        layout.factors = [factor];
        var method;
        if (self.current_layout().id === 0) {
            method = "POST";
        } else {
            method = "PUT";
        }

        $.ajax({
            url: self.layout_url + '?eid=' + self.current_exp().id,
            type: method,
            dataType: "json",
            data: JSON.stringify({layout: [layout]}),
            contentType: "application/json; charset=utf-8",
            success: function(data){
            },
            error: function(data){
            }
        });
    };
}

// ============================================================================
// Gene View Model
// ============================================================================
function GeneVM() {
    var self = this;

    // =====================
    // Experiment objs
    // =====================
    self.experiments = ko.observableArray();
    self.current_exp = ko.observable();           // Current experiment


    // TODO: trigger by switching to gene page.
    $.ajax({
        url: "/api/v2/experiment",
        type: "GET",
        success: function(data){
            for (e in data.experiment){
                self.experiments.push(data.experiment[e]);
            }
        }
    });

    // ========================================================================
    // Factor selection and query
    // ========================================================================
    self.channels = ko.observableArray();
    self.current_channel = ko.observable();

    // ========================================================================
    // Factor selection and query
    // ========================================================================
    // self.current_exp.subscribe(function(exp){
    //     // Fill in self.factors
    //     if (exp){
    //         self.factors([]);
    //         $.map(exp.factors, function(f){
    //             self.factors.push(new Factor(f.id, f.name, f.levels))
    //         })
    //         $.map(exp.channels, function(c){
    //             self.channels.push(new Channel(c.id,  c.name))
    //         })
    //     } else {
    //         self.current_channel(null);
    //         self.factor_panels.removeAll();
    //     }
    // });
    // Available factor for visualization
    self.factors = ko.observableArray();

    // Factor selected
    self.factor_panels = ko.observableArray();

    // Factor chosen to be added
    self.factor_chosen = ko.observable();

    // Add a factor selection panel
    self.add_panel = function() {
        if (self.factor_chosen()){
            self.factor_panels.push(self.factor_chosen());
            self.factors.remove(self.factor_chosen());
            self.factor_chosen(null);
        }
    };

    // Remove a factor
    self.del_panel = function(fact) {
        self.factor_panels.remove(fact);
        self.factors.push(fact);
        self.factors.sort(function(left, right) {
            return left.name == right.name ? 0 :
            (left.name < right.name ? -1 : 1)
        });
        self.factor_chosen();
    };

    // ========================================================================
    // Visualization
    // ========================================================================
    self.graphs = ko.observableArray();
    self.current_graph = 0;
    self.current_graph_id = "";
    self.visualize = function(){
        var factors = $.map(self.factor_panels(), function(f){
            return {"id": f.id, "levels": f.get_chosen_levels()}
        })
        var res = {
            experiment: self.current_exp().id,
            channel: self.current_channel().id,
            factors: factors

        }
        $.ajax({
            url: "/api/v2/timeseries",
            type: "POST",
            dataType: "json",
            data: JSON.stringify(res),
            contentType: "application/json; charset=utf-8",
            success: function(json){
                self.current_graph_id = "id" + self.current_graph;
                self.graphs.push({id: self.current_graph_id})

                var target = "#" + self.current_graph_id;
                var data = json.result;
                data = MG.convert.date(data, 'time', "%H:%M:%S");

                des = "<pre>" + JSON.stringify(json.query, ' ', 2) + "</pre>";
                MG.data_graphic({
                        title: "Hover for Information",
                        description: des,
                        data: data,
                        target: target,
                        show_confidence_band: ['l', 'u'],
                        full_width: true,
                        top: 25,
                        left: 20,
                        right: 20,
                        point_size: 5,
                        area: false,
                        x_accessor: 'time',
                        y_accessor: 'value',
                        show_secondary_x_label: false,
                        mouseover: function(d, i) {
                            // custom format the rollover text, show days
                			var timeFmt = d3.time.format('%H:%M');
                    		var time = timeFmt(d.time);
                            var val = d3.formatPrefix(d.value)
                                        .scale(d.value)
                                        .toFixed(2);
                            var selector = target + ' svg .mg-active-datapoint';
                            d3.select(selector).text("[" + time + "]: " + val);
                            d3.select(selector).style({'font-size': '1em'});
                        }
                    });
                self.current_graph += 1;
            }
        });
    };
    self.row = ko.observable();           // Current experiment
}

// ============================================================================
// Experiment class
// ============================================================================
function Exp(id, name, user, well, factors, channels, dispName) {
    // Parameters:
    //  id: integer. Experiment id
    //  name: string. Experiment name
    //  user: string. Experiment user
    //  well: integer. Number of wells
    //  factors: array of factors
    //  channels: array of channels
    //  displayName
    var self = this;

    self.id = id;
    self.name = ko.observable(name);
    self.user = ko.observable(user);
    self.well = ko.observable(well);
    self.well_types = [96, 384];
    if (!dispName) {
        self.dispName = name;
    } else {
        self.dispName = dispName;
    }

    self.factors = ko.observableArray(
        $.map(factors, function(f){
            return new Factor(f.id, f.name, f.type, f.levels);
        })
    );

    self.channels = ko.observableArray(
        $.map(channels, function(c){
            return new Channel(c.id, c.name);
        })
    );

    // Add a new factor
    self.add_fact = function() {
		1// New Factor object should have a ID of 0
        self.factors.push(new Factor(0, '', null, []));
    };

    // Remove a factor
    self.del_fact = function(fact) {
        self.factors.remove(fact)
    };

    // Add a new dependent
    self.add_chnl = function() { self.channels.push(new Channel(0, '')) };

    // Remove a channel
    self.del_chnl = function(chnl) { self.channels.remove(chnl) };
}


// ============
// Factor class
// ============
var Factor = function(id, name, type, levels) {
    var self = this;
    self.id = id;
    self.name = ko.observable(name);
    self.type = ko.observable(type);
    self.query = ko.observable();

    //TODO keep the selection status while hidden
    self.query.subscribe(function(val){
        // check if string is empty
        if (val){
            for (g in self.levels()){
                if (self.levels()[g].name.search(val) === -1){
                    self.levels()[g]._destroy = true;
                } else {
                    self.levels()[g]._destroy = false;
                }
            }
        } else {
            for (g in self.levels()){
                self.levels()[g]._destroy = false;
            }
        }
        self.levels.valueHasMutated();
    }, self);

    self.levels = ko.observableArray();
    for (var i in levels){
        self.levels.push(new Level(levels[i]))
    }

    self.chosen_levels = ko.observableArray();

    self.get_chosen_levels = function(){
        return $.map(self.chosen_levels(), function(l){return l.name})
    }

    self.factor_types = ['Category', 'Integer', 'Decimal'];
}

// ============
// Layout class
// ============
function Layout(id, name, dispName) {
    var self = this;

    self.id = id;
    self.name = ko.observable(name);
    if (!dispName){
        self.dispName = name;
    } else {
        self.dispName = dispName;
    }

    self.factors = ko.observableArray();
}

// =============
// Channel class
// =============
function Channel(id, name) {
    this.id = id;
    this.name = ko.observable(name);
}

// Get Factor for experiment
// return a observableArray of Factor
function getFactors(exp) {
    return ko.observableArray([new Factor('A'),
                               new Factor('B')]);
}

// Search


var Level = function(name){
    var self = this;
    self.name = name;
    self.value = 1;
}

// ========================================================================
// handsontable
// ========================================================================
var createSetting = function(nWell, fixRow){
    var self = this;
    switch (nWell) {
        case 96:
            var nRow = 8;
            var nCol = 12;
            break;
        case 384:
            var nRow = 16;
            var nCol = 24;
            break;
        default:
            return
    }
    self.startRows = nRow;
    self.minRows = nRow;
    if (fixRow) {
        self.maxRows = nRow;
    }

    self.startCols = nCol;
    self.minCols = nCol;
    self.maxCols = nCol;

    self.manualColumnResize = true;
    self.manualRowResize = true;
    self.contextMenu = true;

    self.rowHeaders = function(i) { return String.fromCharCode(65 + i); };
    self.colHeaders = function(i) { return i+1; };
};

// TODO oop setting, make it dynamic for all types of tables
var setting = {
    startCols:12,
    minCols:12,
    maxCols:12,
    // colWidths: 28,
    startRows:8,
    manualColumnResize:true,
    manualRowResize:true,
    rowHeaders:function (i) { return String.fromCharCode(65 + i); },
    colHeaders:function (i) { return i+1; },
    contextMenu: true
};

// var container1 = document.getElementById("well");
// var hot1 = new Handsontable(container1, setting);
// var container2 = document.getElementById("data_table");
// var hot2 = new Handsontable(container2, setting);

$("#time-slider").slider();

var vm;
$(function(){
    vm = new viewModel();
    ko.applyBindings(vm);
});
