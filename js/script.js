
//test if browser supports webGL

if(Modernizr.webgl) {

	//setup pymjs
	var pymChild = new pym.Child();

	//Load data and config file
	d3.queue()
		.defer(d3.csv, "data/value.csv")
		.defer(d3.json, "data/config.json")
		.defer(d3.json, "data/geog.json")
		.await(ready);


	function ready (error, valuedata, config, geog){

		//Set up global variables
		dvc = config.ons;
		oldAREACD = "";
		value = false;
		d3.select("#switch").on("click", switchMe)

		//set title of page
		//Need to test that this shows up in GA
		document.title = dvc.maptitle;

		//Fire design functions
		//selectlist(data);
		createLegend(dvc);

		//Set up number formats
		displayformat = d3.format("." + dvc.displaydecimals + "f");
		legendformat = d3.format("." + dvc.legenddecimals + "f");

		// draw the stacked bar
		var widthPollution = document.getElementById('pollution-removed').clientWidth;
		var heightPollution = 100;

		var marginPollution = {
	    top: 0,
	    bottom: 30,
	    left: 10,
	    right: 10
		};

		var svgPollution = d3.select("#pollution-removed")
	    .append("svg")
	    .attr("width", widthPollution)
	    .attr("height", heightPollution)
	    .attr("align", "center")
	    .append("g")
	    .attr("transform", "translate(" + marginPollution.left + "," + marginPollution.top + ")");

		widthPollution = widthPollution - marginPollution.left - marginPollution.right;
		heightPollution = heightPollution - marginPollution.top - marginPollution.bottom;

		var y = d3.scaleBand()
			.rangeRound([heightPollution, 0])
			// .padding(0.3)
			// .align(0.3);

		var x = d3.scaleLinear()
			.rangeRound([0, widthPollution]);

		var z = d3.scaleOrdinal(d3.schemeCategory20)
    	.range(["#c9c9c9", "#404da3"]);

		var stack = d3.stack()
	    .offset(d3.stackOffsetExpand);

		var x_axis = d3.axisBottom()
	    .scale(x);

		var y_axis = d3.axisLeft()
	    .scale(y);

		svgPollution.append("g")
	    .attr("class", "axis--x")
	    .attr("transform", "translate(0," + heightPollution + ")");


		// function that inserts data to stacked back
		// run function on load with total pollution data from a postcode or 0

		drawStacked(1500)

		function drawStacked(data) {
			total_data = [{
				"index": "value",
				"areaVal": data,
				"totalMax": 20060
			}];

			var key = ["areaVal", "totalMax"];

			total_data.sort(function(a, b) {console.log(a)
  				return b.total - a.total;
        });

			console.log(total_data.sort(function(a, b) {
			  				return b.total - a.total;}));

			x.domain([0, 1]).nice()
      y.domain(total_data.map(function(d) { console.log(d.index)
            return d.index;
        }));
      z.domain(total_data);

			var layer = svgPollution.selectAll(".serie")
            .data(stack.keys(key)(total_data))

        // exit
        layer
            .exit()
            .remove()

        // enter
        var new_layer = layer.enter()
            .append("g")
            .attr("class", "serie")

        new_layer.selectAll("rect")
            .data(function(d) { console.log(d)
                return d;
            })
            .enter().append("rect")
            .attr("y", function(d) {console.log(d)
                return y(d.data.index);
            })
            // .transition()
            // .duration(1000)
            .attr("x", function(d) {
                return x(d[0]);
            })
            .attr("width", function(d) {
                return x(d[1]) - x(d[0]);
            })
            .attr("height", y.bandwidth())
            .attr("fill", z);

        // update
        new_layer.merge(layer)
            .selectAll("rect")
            .data(function(d) {
                return d;
            })
            .transition()
            .duration(1000)
            .attr("width", function(d) {
                return x(d[1]) - x(d[0]);
            })
						.attr("height", y.bandwidth())

            .attr("y", function(d) {
                return y(d.data.index);
            })
            .attr("x", function(d) {
                return x(d[0]);
            });

		}



		//set up basemap
		map = new mapboxgl.Map({
		  container: 'map', // container id
		 // style: style,
		  style: "data/style.json", //stylesheet location
		  center: [0.12, 51.50], // starting position
		  zoom: 8, // starting zoom
		  maxZoom: 20, //
		  attributionControl: false
		});
		//add fullscreen option
		map.addControl(new mapboxgl.FullscreenControl());

		// Add zoom and rotation controls to the map.
		map.addControl(new mapboxgl.NavigationControl());

		// Disable map rotation using right click + drag
		map.dragRotate.disable();

		// Disable map rotation using touch rotation gesture
		map.touchZoomRotate.disableRotation();


		// Add geolocation controls to the map.
		map.addControl(new mapboxgl.GeolocateControl({
			positionOptions: {
				enableHighAccuracy: true
			}
		}));

		//add compact attribution
		map.addControl(new mapboxgl.AttributionControl({
			compact: true
		}));



		//addFullscreen();

		function defineBreaks(){

			rateById = {};
			areaById = {};

			valuedata.forEach(function(d) {rateById[d.AREACD] = +d[variables[0]]; areaById[d.AREACD] = d.AREANM}); //change to brackets
			console.log(rateById);
			breaks = config.ons.breaks[0];

		}

		function setupScales() {
			//set up d3 color scales
			//Load colours
			if(typeof dvc.varcolour === 'string') {
				colour = colorbrewer[dvc.varcolour][dvc.numberBreaks];
			} else {
				colour = dvc.varcolour;
			}

			//set up d3 color scales
			color = d3.scaleThreshold()
					.domain(breaks.slice(1))
					.range(colour);

		}


		////////////////////build value map/////////////////////////

		//Get column names
		variables = [];
		for (var column in valuedata[0]) {
			if (column == 'AREACD') continue;
			if (column == 'AREANM') continue;
			variables.push(column);
		}

		defineBreaks();
		setupScales();

		//convert topojson to geojson
		for(key in geog.objects){
			var areas = topojson.feature(geog, geog.objects[key])
		}

		//and add properties to the geojson based on the csv file we've read in
				areas.features.map(function(d,i) {
				  if(!isNaN(rateById[d.properties.AREACD]))
				  	{d.properties.fill = color(rateById[d.properties.AREACD])
						 d.properties.value = rateById[d.properties.AREACD]}
				  else {d.properties.fill = '#ccc'};
				});





		map.on('load', function() {

			map.addSource('area', { 'type': 'geojson', 'data': areas });

				map.addLayer({
					'id': 'area',
					'type': 'fill',
					'source': 'area',
					'touchAction':'none',
					"layout": {
						"visibility": "visible"
					},
					'paint': {
						'fill-color': {
							type: 'identity',
							property: 'fill'
						 },
						'fill-opacity': 0.0,
						'fill-outline-color': '#fff'
					}
				}, 'place_suburb');

				map.addLayer({
					"id": "state-fills-hover",
					"type": "line",
					"source": "area",
					"layout": {},
					"paint": {
						"line-color": "rgba(0,0,0,0)",
						"line-width": 2
					},
					"filter": ["==", "AREACD", ""]
				}, 'place_suburb');



			zoomThreshold = 11;


			// Add Mapillary sequence layer.
			// https://www.mapillary.com/developer/tiles-documentation/#sequence-layer
			map.addLayer({
				"id": "pollution",
				'type': 'fill',
				"source": {
					"type": "vector",
					"tiles": ["http://localhost/pollution/pollutionmap/tiles/{z}/{x}/{y}.pbf"],
					"minzoom": 4,
					"maxzoom": 14
				},
				"source-layer": "pollution",
				'paint': {
            'fill-opacity':0.5,
						'fill-outline-color':'rgba(0,0,0,0)',
            'fill-color': {
                // Refers to the data of that specific property of the polygon
              'property': 'pollution_SO2',
              // Prevents interpolation of colors between stops
              'base': 0,
              // Stops are an array of two element arrays:
              // [value_of_property, color]
              // The color applies to values equal or below the value_of_property
              'stops': [
								[-145, '#eff3ff'],
									[190, '#c6dbef'],
									[392, '#9ecae1'],
									[700, '#6baed6'],
									[2282, '#3182bd'],
									[6761, '#08519c']
              ]
            }

          }
			}, 'place_suburb');

		// });

			map.addLayer({
                "id": "onekmhover",
                "type": "line",
                "source": {
                    "type": "vector",
                    "tiles": ["http://localhost/pollution/pollutionmap/tiles/{z}/{x}/{y}.pbf"],
                    "minzoom": 1,
                    "maxzoom": 14
                },
                "source-layer": "pollution",
								"minzoom": 9,
								"maxzoom": 14,

                // "minzoom": zoomThreshold,
                // "maxzoom": (zoomThreshold+1,
                "layout": {
                    "visibility": "visible"
                },
                "paint": {
                    "line-color": "#000",
                    "line-width": 2
                },
                "filter": ["==", "GID", ""]
            }, 'place_suburb');




		});

		map.on('click', 'pollution', onClick);


            //Highlight stroke on mouseover (and show area information)
            map.on("mousemove", "pollution", onMove);

            // Reset the state-fills-hover layer's filter when the mouse leaves the layer.
            map.on("mouseleave", "pollution", onLeave);

		$("#submitPost").click(function( event ) {
						event.preventDefault();
						event.stopPropagation();
						myValue=$("#pcText").val();

						getCodes(myValue);
		});

		// update the map when selecting dropdown

		$('#pollutant-select').on('change', function() {
			pollutant = $('#pollutant-select').val();
			updateLayers(pollutant)
			console.log(pollutant)
		})



		// d3.selectAll("input[name='button']")
	  //   .on('click', function() {
	  //     pollutant = this.value;
		// 		updateLayers(pollutant)
	  //   });

		function updateLayers(pollVal) {
			console.log(pollVal);
			//set up style object

			var dataBreaks = {
				'pollution_SO2':
				[[-145, '#eff3ff'],
					[190, '#c6dbef'],
					[392, '#9ecae1'],
					[700, '#6baed6'],
					[2282, '#3182bd'],
					[6761, '#08519c']],

				'pollution_total':
				[[-2132, '#eff3ff'],
					[2349, '#c6dbef'],
					[4674, '#9ecae1'],
					[6236, '#6baed6'],
					[8206, '#3182bd'],
					[20059, '#3182bd']],

				'pollution_O3':
				[[-891, '#eff3ff'],
					[1552, '#c6dbef'],
					[3434, '#9ecae1'],
					[4769, '#6baed6'],
					[5818, '#3182bd'],
					[8892, '#3182bd']],

				'pollution_NH3':
				[[-79, '#eff3ff'],
					[101, '#c6dbef'],
					[218, '#9ecae1'],
					[336, '#6baed6'],
					[506, '#3182bd'],
					[1449, '#3182bd']],

				'pollution_PM10':
				[[-1161, '#eff3ff'],
					[125, '#c6dbef'],
					[336, '#9ecae1'],
					[670, '#6baed6'],
					[1134, '#3182bd'],
					[4416, '#3182bd']],

				'pollution_PM25':
				[[-178, '#eff3ff'],
					[68, '#c6dbef'],
					[175, '#9ecae1'],
					[342, '#6baed6'],
					[602, '#3182bd'],
					[1662, '#3182bd']],

				'pollution_NO2':
				[[-18, '#eff3ff'],
					[137, '#c6dbef'],
					[329, '#9ecae1'],
					[573, '#6baed6'],
					[925, '#3182bd'],
					[3577, '#3182bd']]



			}

			console.log(dataBreaks[pollVal])

			styleObject = {
									property: pollVal,
									'stops': dataBreaks[pollVal]

						}
			//repaint area layer map usign the styles above
			map.setPaintProperty('pollution', 'fill-color', styleObject);
		};


			//Highlight stroke on mouseover (and show area information)
			map.on("mousemove", "OAbounds", onMove);


			//Work out zoom level and update
			map.on("moveend", function (e) {
				zoom = parseInt(map.getZoom());

				console.log(zoom)

				baselevel = 13;
				numberperdotlowest = 10;
				dropdensity = 2;

				if(zoom < baselevel) {
					thepowerof = (baselevel - zoom);
					numberperdot = numberperdotlowest * Math.pow(dropdensity,thepowerof);

					d3.select("#people").text("1 dot = ~" +  (numberperdot).toLocaleString('en-GB') + " people")
				} else {
					d3.select("#people").text("1 dot = ~10 people")
				}
			});

			function getCodes(myPC)	{

				console.log(myPC);

					var myURIstring=encodeURI("https://api.postcodes.io/postcodes/"+myPC);
					$.support.cors = true;
					$.ajax({
						type: "GET",
						crossDomain: true,
						dataType: "jsonp",
						url: myURIstring,
						error: function (xhr, ajaxOptions, thrownError) {
							console.log(thrownError);
								//$("#pcError").text("couldn't process this request").show();

							},
						success: function(data1){
							if(data1.status == 200 ){
								console.log(data1);
								//$("#pcError").hide();
								lat =data1.result.latitude;
								lng = data1.result.longitude;

								success(lat,lng)
								//$("#successMessage").text("The postcode " + myPC + " is situated in " + areaName + " which has an area code of " + area).show();
							} else {
			          //$("#successMessage").hide();
								//$("#pcError").text("Not a valid postcode I'm afraid").show();
							}
						}

					});

				}

		function success(lat,lng) {

		  //go on to filter
		  //Translate lng lat coords to point on screen
		  point = map.project([lng,lat]);
			console.log(point);

			map.flyTo({center:[lng,lat], zoom:10, duration:4000})

			map.on('flystart', function(){
				flying=true;
			});

			map.on('flyend', function(){
				flying=false;
			});

			setTimeout(function(){
                // var features = map.queryRenderedFeatures(queryBox);
                //
                // var features = map.queryRenderedFeatures(queryBox);
                // console.log(features)
                // map.setFilter("onekmhover", ["==", "GID", features[0].properties.GID]);
                point = map.project([lng,lat]);

                var features = map.queryRenderedFeatures(point);

								console.log(features);
								// console.log(features[0].properties.pollution_total)
								drawStacked(features[0].properties.pollution_total)
								d3.select('#SO2').text(features[0].properties['pollution_SO2']);
								d3.select('#O3').text(features[0].properties['pollution_O3']);
								d3.select('#NO2').text(features[0].properties['pollution_NO2']);
								d3.select('#NH3').text(features[0].properties['pollution_NH3']);
								d3.select('#PM10').text(features[0].properties['pollution_PM10']);
								d3.select('#PM25').text(features[0].properties['pollution_PM25']);
								d3.select('#Total').text(features[0].properties['pollution_total']);

                map.setFilter("onekmhover", ["==", "GID", features[0].properties.GID]);
								map.setFilter("state-fills-hover", ["==", "AREACD", features[1].properties.AREACD]);

            },4500);

			// map.on('moveend',function(e){
			//
			// 			//then check what features are underneath
			// 			var features = map.queryRenderedFeatures(point);
			//
			// 			console.log(features)
			// 			console.log(features[0].properties['pollution_SO2'])
			// 			d3.select('#SO2').text(features[0].properties['pollution_SO2'])
			// 			d3.select('#O3').text(features[0].properties['pollution_O3'])
			// 			d3.select('#NO2').text(features[0].properties['pollution_NO2'])
			// 			d3.select('#NH3').text(features[0].properties['pollution_NH3'])
			// 			d3.select('#PM10').text(features[0].properties['pollution_PM10'])
			// 			d3.select('#PM25').text(features[0].properties['pollution_PM25'])
			// 			d3.select('#Total').text(features[0].properties['pollution_total'])
			//
			//
			// 			//then select area
			// 			//disableMouseEvents();
			//
			// 			map.setFilter("OAboundshover", ["==", "GID", features[0].properties['GID']]);
			//
			//
			// });


		};


		function onMove(e) {
			map.getCanvasContainer().style.cursor = 'pointer';
// 				newAREACD = e.features[0].properties['GID'];
//
// 				if(newAREACD != oldAREACD) {
// 					oldAREACD = e.features[0].properties['GID'];
// 					map.setFilter("OAboundshover", ["==", "GID", e.features[0].properties['GID']]);
//
// 				//	console.log(e.features[0].properties);
//
// 					totalpop = +e.features[0].properties["ethnicityOA_Asian / Asian British: Bangladeshi"] +
// 							+e.features[0].properties["ethnicityOA_Asian / Asian British: Chinese"] +
// 							+e.features[0].properties["ethnicityOA_Asian / Asian British: Indian"] +
// 							+e.features[0].properties["ethnicityOA_Asian / Asian British: Other Asian"] +
// 							+e.features[0].properties["ethnicityOA_Asian / Asian British: Pakistani"] +
// 							+e.features[0].properties["ethnicityOA_White"] +
// 							+e.features[0].properties["ethnicityOA_Black / African / Caribbean / Black British"] +
// 							+e.features[0].properties["ethnicityOA_Mixed / Multiple ethnic group"] +
// 							+e.features[0].properties["ethnicityOA_Other Ethnic Group"];
//
// 					asian = displayformat(((+e.features[0].properties["ethnicityOA_Asian / Asian British: Bangladeshi"] +
// 							+e.features[0].properties["ethnicityOA_Asian / Asian British: Chinese"] +
// 							+e.features[0].properties["ethnicityOA_Asian / Asian British: Indian"] +
// 							+e.features[0].properties["ethnicityOA_Asian / Asian British: Other Asian"] +
// 							+e.features[0].properties["ethnicityOA_Asian / Asian British: Pakistani"])/totalpop)*100);
//
// 					white = displayformat((+e.features[0].properties["ethnicityOA_White"]/totalpop)*100);
//
// 					black = displayformat((+e.features[0].properties["ethnicityOA_Black / African / Caribbean / Black British"]/totalpop)*100);
// 					mixed = displayformat((+e.features[0].properties["ethnicityOA_Mixed / Multiple ethnic group"]/totalpop)*100);
// 					other = displayformat((+e.features[0].properties["ethnicityOA_Other Ethnic Group"]/totalpop)*100);
//
//
// 					percentages = [white,black,asian,mixed,other];
//
// 					d3.selectAll(".percentlabel").remove();
//
// 					legend.insert("label",".legendBlocks").attr('class','percentlabel').text(function(d,i) {
// 						return percentages[i] + "%";
// 					});
//
// 					percentages.forEach(function(d,i) {
// 						d3.select("#legendRect" + i).transition().duration(300).style("width", (percentages[i]/3.3333333) + "px");
// 					});
//
//
//
//
//
// //					selectArea(e.features[0].properties.oa11cd);
// //					setAxisVal(e.features[0].properties.oa11cd);
// 				}
		};


		function onLeave() {
				map.setFilter("state-fills-hover", ["==", "AREACD", ""]);
				oldAREACD = "";
				$("#areaselect").val("").trigger("chosen:updated");
				hideaxisVal();
		};

		function onClick(e) {
		                //disableMouseEvents();
		                newAREACD = e.features[0].properties.GID;
										d3.select('#SO2').text(e.features[0].properties['pollution_SO2'])
										d3.select('#O3').text(e.features[0].properties['pollution_O3'])
										d3.select('#NO2').text(e.features[0].properties['pollution_NO2'])
										d3.select('#NH3').text(e.features[0].properties['pollution_NH3'])
										d3.select('#PM10').text(e.features[0].properties['pollution_PM10'])
										d3.select('#PM25').text(e.features[0].properties['pollution_PM25'])
										d3.select('#Total').text(e.features[0].properties['pollution_total'])


		                if(newAREACD != oldAREACD) {
		                    oldAREACD = e.features[0].properties.GID;

		                    map.setFilter("onekmhover", ["==", "GID", e.features[0].properties.GID]);

		                    //selectArea(e.features[0].properties.GID);
		                    //setAxisVal(e.features[0].properties.AREACD);

		                }
		        };
		function disableMouseEvents() {
				map.off("mousemove", "area", onMove);
				map.off("mouseleave", "area", onLeave);
		}

		function enableMouseEvents() {
				map.on("mousemove", "area", onMove);
				//map.on("click", "area", onClick);
				map.on("mouseleave", "area", onLeave);
		}

		function selectArea(code) {
			$("#areaselect").val(code).trigger("chosen:updated");
		}

		function zoomToArea(code) {

			specificpolygon = areas.features.filter(function(d) {return d.properties.AREACD == code})

			specific = turf.extent(specificpolygon[0].geometry);

			map.fitBounds([[specific[0],specific[1]], [specific[2], specific[3]]], {
  				padding: {top: 150, bottom:150, left: 100, right: 100}
			});

		}

		function resetZoom() {

			map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]]);

		}


		function setAxisVal(code) {
			d3.select("#currLine")
				.style("opacity", function(){if(!isNaN(rateById[code])) {return 1} else{return 0}})
				.transition()
				.duration(400)
				.attr("x1", function(){if(!isNaN(rateById[code])) {return x(rateById[code])} else{return x(midpoint)}})
				.attr("x2", function(){if(!isNaN(rateById[code])) {return x(rateById[code])} else{return x(midpoint)}});


			d3.select("#currVal")
				.text(function(){if(!isNaN(rateById[code]))  {return displayformat(rateById[code])} else {return "Data unavailable"}})
				.style("opacity",1)
				.transition()
				.duration(400)
				.attr("x", function(){if(!isNaN(rateById[code])) {return x(rateById[code])} else{return x(midpoint)}});

		}

		function hideaxisVal() {
			d3.select("#currLine")
				.style("opacity",0)

			d3.select("#currVal").text("")
				.style("opacity",0)
		}

		function createLegend(keydata) {

			//d3.select("#keydiv")
			console.log(keydata);

			// d3.select('#keydiv').append("p").attr("id","people").text("placeholder");
			//
			// legend = d3.select('#keydiv')
			// 	.append('ul')
			// 	.attr('class', 'key')
			// 	.selectAll('g')
			// 	.data(keydata.groups)
			// 	.enter()
			// 	.append('li')
			// 	//.style("background-color", function(d , i) { return dvc.essential.colour_palette[i]; })
			// 	.attr('class', function(d, i) { return 'key-item key-' + i + ' b '+ d.replace(' ', '-').toLowerCase(); })
			// 	.on("mouseover",function(d, i){
			// 		d3.selectAll(".key-item").style("opacity",0.2);
			// 		d3.selectAll(".key-" + i).style("opacity",1);
			// 	})
			// 	.on("mouseout",function(d, i){
			// 		d3.selectAll(".key-item").style("opacity",1);
			// 	})
			//
			// legend.append('label').attr('class','legendlabel').text(function(d,i) {
			// 	var value = parseFloat(d).toFixed(1);
			// 	return d;
			// });
			//
			// legend.append('div').style("width","40px").style("float","right").append("div").attr("class", "legendRect").attr("id",function(d,i){return "legendRect" + i}).style("width","0px");
			//
			// legend.append('b').attr("class", "legendBlocks")
			// 	.style("background-color", function(d , i) { return keydata.colours[i]; });





		}

		function createKey(config){

			// keywidth = d3.select("#keydiv").node().getBoundingClientRect().width;
			//
			// var svgkey = d3.select("#keydiv")
			// 	.append("svg")
			// 	.attr("id", "key")
			// 	.attr("width", keywidth)
			// 	.attr("height",65);
			//
			//
			// var color = d3.scaleThreshold()
			//    .domain(breaks)
			//    .range(colour);
			//
			// // Set up scales for legend
			// x = d3.scaleLinear()
			// 	.domain([breaks[0], breaks[dvc.numberBreaks]]) /*range for data*/
			// 	.range([0,keywidth-30]); /*range for pixels*/
			//
			//
			// var xAxis = d3.axisBottom(x)
			// 	.tickSize(15)
			// 	.tickValues(color.domain())
			// 	.tickFormat(legendformat);
			//
			// var g2 = svgkey.append("g").attr("id","horiz")
			// 	.attr("transform", "translate(15,30)");
			//
			//
			// keyhor = d3.select("#horiz");
			//
			// g2.selectAll("rect")
			// 	.data(color.range().map(function(d,i) {
			//
			// 	  return {
			// 		x0: i ? x(color.domain()[i+1]) : x.range()[0],
			// 		x1: i < color.domain().length ? x(color.domain()[i+1]) : x.range()[1],
			// 		z: d
			// 	  };
			// 	}))
			//   .enter().append("rect")
			// 	.attr("class", "blocks")
			// 	.attr("height", 8)
			// 	.attr("x", function(d) {
			// 		 return d.x0; })
			// 	.attr("width", function(d) {return d.x1 - d.x0; })
			// 	.style("opacity",0.8)
			// 	.style("fill", function(d) { return d.z; });
			//
			//
			// g2.append("line")
			// 	.attr("id", "currLine")
			// 	.attr("x1", x(10))
			// 	.attr("x2", x(10))
			// 	.attr("y1", -10)
			// 	.attr("y2", 8)
			// 	.attr("stroke-width","2px")
			// 	.attr("stroke","#000")
			// 	.attr("opacity",0);
			//
			// g2.append("text")
			// 	.attr("id", "currVal")
			// 	.attr("x", x(10))
			// 	.attr("y", -15)
			// 	.attr("fill","#000")
			// 	.text("");
			//
			//
			//
			// keyhor.selectAll("rect")
			// 	.data(color.range().map(function(d, i) {
			// 	  return {
			// 		x0: i ? x(color.domain()[i]) : x.range()[0],
			// 		x1: i < color.domain().length ? x(color.domain()[i+1]) : x.range()[1],
			// 		z: d
			// 	  };
			// 	}))
			// 	.attr("x", function(d) { return d.x0; })
			// 	.attr("width", function(d) { return d.x1 - d.x0; })
			// 	.style("fill", function(d) { return d.z; });
			//
			// keyhor.call(xAxis).append("text")
			// 	.attr("id", "caption")
			// 	.attr("x", -63)
			// 	.attr("y", -20)
			// 	.text("");
			//
			// keyhor.append("rect")
			// 	.attr("id","keybar")
			// 	.attr("width",8)
			// 	.attr("height",0)
			// 	.attr("transform","translate(15,0)")
			// 	.style("fill", "#ccc")
			// 	.attr("x",x(0));
			//
			//
			// if(dvc.dropticks) {
			// 	d3.select("#horiz").selectAll("text").attr("transform",function(d,i){
			// 			// if there are more that 4 breaks, so > 5 ticks, then drop every other.
			// 			if(i % 2){return "translate(0,10)"} }
			// 	);
			// }
			// //Temporary	hardcode unit text
			// dvc.unittext = "change in life expectancy";
			//
			// d3.select("#keydiv").append("p").attr("id","keyunit").style("margin-top","-10px").style("margin-left","10px").text(dvc.varunit);

	} // Ends create key

	function addFullscreen() {

		currentBody = d3.select("#map").style("height");
		d3.select(".mapboxgl-ctrl-fullscreen").on("click", setbodyheight)

	}

	function setbodyheight() {
		d3.select("#map").style("height","100%");

		document.addEventListener('webkitfullscreenchange', exitHandler, false);
		document.addEventListener('mozfullscreenchange', exitHandler, false);
		document.addEventListener('fullscreenchange', exitHandler, false);
		document.addEventListener('MSFullscreenChange', exitHandler, false);

	}

	function switchMe() {
		if(value == false) {
			value = true;
			map.setPaintProperty('area', 'fill-opacity', 0.7);
			map.setPaintProperty('state-fills-hover', 'line-color', "rgba(0,0,0,1)");
			map.setPaintProperty('pollution', 'fill-opacity', 0);
			map.setPaintProperty('onekmhover', 'line-opacity', 0);


		} else {
			value = false;
			map.setPaintProperty('area', 'fill-opacity', 0.0);
			map.setPaintProperty('state-fills-hover', 'line-color', "rgba(0,0,0,0)")
			map.setPaintProperty('pollution', 'fill-opacity', 0.7);
			map.setPaintProperty('onekmhover', 'line-opacity', 0.7);
		}
		console.log("hello")


	}


	function exitHandler() {

		console.log("shrink");
			if (document.webkitIsFullScreen === false)
			{
				shrinkbody();
			}
			else if (document.mozFullScreen === false)
			{
				shrinkbody();
			}
			else if (document.msFullscreenElement === false)
			{
				shrinkbody();
			}
		}

	function shrinkbody() {
		d3.select("#map").style("height",currentBody);
		pymChild.sendHeight();
	}

	function geolocate() {

		var options = {
		  enableHighAccuracy: true,
		  timeout: 5000,
		  maximumAge: 0
		};

		navigator.geolocation.getCurrentPosition(success, error, options);
	}



		function selectlist(datacsv) {

			var areacodes =  datacsv.map(function(d) { return d.AREACD; });
			var areanames =  datacsv.map(function(d) { return d.AREANM; });
			var menuarea = d3.zip(areanames,areacodes).sort(function(a, b){ return d3.ascending(a[0], b[0]); });

			// Build option menu for occupations
			var optns = d3.select("#selectNav").append("div").attr("id","sel").append("select")
				.attr("id","areaselect")
				.attr("style","width:98%")
				.attr("class","chosen-select");


			optns.append("option")
				.attr("value","first")
				.text("");

			optns.selectAll("p").data(menuarea).enter().append("option")
				.attr("value", function(d){ return d[1]})
				.text(function(d){ return d[0]});

			myId=null;

			$('#areaselect').chosen({width: "98%", allow_single_deselect:true}).on('change',function(evt,params){

					if(typeof params != 'undefined') {

							disableMouseEvents();

							map.setFilter("state-fills-hover", ["==", "AREACD", params.selected]);

							selectArea(params.selected);
							setAxisVal(params.selected);

							zoomToArea(params.selected);

					}
					else {
							enableMouseEvents();
							hideaxisVal();
							onLeave();
							resetZoom();
					}

			});

	};

	}

} else {

	//provide fallback for browsers that don't support webGL
	d3.select('#map').remove();
	d3.select('body').append('p').html("Unfortunately your browser does not support WebGL. <a href='https://www.gov.uk/help/browsers' target='_blank>'>If you're able to please upgrade to a modern browser</a>")

}
