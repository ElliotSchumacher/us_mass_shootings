"use strict"

window.addEventListener("load", init);

let currentYear;
let inMapView;
let lineChart;
let stateData, stateList, shootingData, populationData, highestShootingRates;

async function init() {
  currentYear = "21";
  inMapView = true;
  [stateData, stateList, shootingData, populationData, highestShootingRates] = await Promise.all([d3.json("./data/usState.geojson"), 
    d3.csv("./data/mass_shootings_shrunk.csv"),
    d3.csv("./data/population.csv")])
    .then(processData)
    .catch(console.error)
  
  await createMap();
  let yearSelect = document.querySelector("select");
  yearSelect.addEventListener("change", updateYear)
}

async function updateYear(event) {
  currentYear = event.target.value;
  await createMap();
}

// function openReferenceWindow() {
//   window.open("./test.html", "test")
// }

/**
 * Populates the info panel with state information and the state's mass shooting statistics.
 * @param {Object} clickedState -  The GeoJSON feature of the state to show info on.
 */
async function showDetails(clickedState) {
  // Swap to detail view if not aready there
  if (inMapView) {
    await swapViews();
    inMapView = !inMapView;
  }
  let state = clickedState.properties.stateName;

  // Update info pane header
  let stateLabel = document.querySelector("#info h2");
  stateLabel.innerHTML = clickedState.properties.name;
  
  // Populate statistics in info panel
  let {totalIncidents, totalKilled, totalInjuries, population} = calculateStatistics(currentYear, state); 
  document.getElementById("incident-rate").innerHTML = ((totalIncidents / population) * 1000000).toFixed(1); // rate per million
  document.getElementById("incident-total").innerHTML = totalIncidents;
  document.getElementById("fatalities-rate").innerHTML = ((totalKilled / population) * 1000000).toFixed(1); // rate per million
  document.getElementById("fatalities-total").innerHTML = totalKilled;
  document.getElementById("injuries-rate").innerHTML = ((totalInjuries / population) * 1000000).toFixed(1); // rate per million
  document.getElementById("injuries-total").innerHTML = totalInjuries;
  document.getElementById("population-total").innerHTML = parseInt(population).toLocaleString();

  // Create chart
  // Set chart's canvas width and height
  let map = document.getElementById("map"); // 
  let explanation = document.getElementById("explanation");
  let canvas = document.getElementById("line-chart");
  let chartWrapper = document.getElementById("chart");
  let chartWidth = getWidth(map);
  let chartHeight = getHeight(explanation);
  console.log("chart width", getWidth(map));
  console.log("chart height", getHeight(explanation));
  chartWrapper.width = chartWidth;
  chartWrapper.height = chartHeight;
  // canvas.width = chartWidth;
  // canvas.height = chartHeight;

  // draw the chart
  drawChart(state, clickedState.properties.name);
}

/**
 * Calculates count and sum information that is displayed in the info panel.
 * @param {String} year - The last two digits of the year to generate statistics for.
 * @param {String} state - The name of the state to generate statistics for in lowercase.
 * @returns {Object} - The number of shootings, the sum of people killed and injured and
 *                     the state's population.
 */
function calculateStatistics(year, state) {
  let stateShootingData = shootingData[year][state] ? shootingData[year][state] : [];
  let totalIncidents = stateShootingData.length;
  let totalKilled = stateShootingData.map(item => parseInt(item["# Killed"]))
    .reduce((prev, next) => prev + next, 0);
  let totalInjuries = stateShootingData.map(item => parseInt(item["# Injured"]))
    .reduce((prev, next) => prev + next, 0);
  let population = populationData[state]["POPESTIMATE20" + year];
  return {totalIncidents, totalKilled, totalInjuries, population}
}

/**
 * Swaps between the map and detail view and reloads the map.
 */
async function swapViews() {
  document.getElementById("info").classList.toggle("hidden");
  // document.getElementById("line-chart").classList.toggle("hidden");
  document.getElementById("map").classList.toggle("shrink");
  document.getElementById("explanation").classList.toggle("hidden");
  document.getElementById("chart").classList.toggle("hidden");
  let map = document.getElementById("map");
  console.log("map width", getWidth(map));
  console.log("map height", getHeight(map));
  await createMap();
}

/**
 * Calculates and returns width of the map container.
 * @param {DOM Element} element - The HTML element to get the width of.
 * @returns {int} - the width of the map container contents
 */
function getWidth(element) {
  let styles = getComputedStyle(element)
  return Math.floor(element.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight));
}

/**
 * Calculates and return the height of the map container.
 * @param {DOM Element} element - The HTML element to get the height of.
 * @returns {int} - the height of the map contain contents
 */
function getHeight(element) {
  let styles = getComputedStyle(element)
  return Math.floor(element.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom));
}

function processData([stateData, shootingData, populationData]) {
  // Add lowercase state names to each state object in state and population data
  for (let state of stateData.features) {
    state.properties.stateName = state.properties.name.toLowerCase();
  }
  for (let state of populationData) {
    state.stateName = state.NAME.toLowerCase();
  }

  // Transform population data from an array to an object
  let mappedPopulationData = populationData.map((item) => ({[item.stateName]: item}));
  let processedPopulationData = Object.assign({}, ...mappedPopulationData);

  // Add lowercase state names lowercase and grouping data by year and then state
  let shootingByYear = {};
  for (let shooting of shootingData) {
    shooting.stateName = shooting.State.toLowerCase();
    let year = shooting["Incident Date"].split("-")[2];
    let state = shooting.stateName;
    if (!shootingByYear[year]) {
      shootingByYear[year] = {};
    }
    if (!shootingByYear[year][state]) {
      shootingByYear[year][state] = [];
    }
    shootingByYear[year][state].push(shooting)
  }

  // Create list of states
  let stateList = stateData.features.map((d) => { return d.properties.stateName.toLowerCase() })

  // Find max shooting rate per year
  // let highestShootingRates = {}
  // for (let year of ["16","17", "18", "19", "20", "21"]) {
  //   highestShootingRates[year] = 0;
  //   for (let state of stateList) {
  //     let rate = getShootingRate(year, state, shootingByYear, processedPopulationData);
  //     highestShootingRates[year] = Math.max(highestShootingRates[year], rate)
  //   }
  // }
  // console.log("highestShootingRates", highestShootingRates);
  // return [stateData, stateList, shootingByYear, processedPopulationData, highestShootingRates];
  return [stateData, stateList, shootingByYear, processedPopulationData];
}

function createMap() {
  // Remove existing SVG so that new map can be drawn
  let preexistingSVG = document.querySelector("svg");
  if (preexistingSVG) {
    preexistingSVG.remove();
  }

  // Setup map properties
  let map = document.getElementById("map");
  let mapHeight = getHeight(map);
  let mapWidth = getWidth(map);
  let projection = d3.geoAlbersUsa();
  let path = d3.geoPath().projection(projection);

  projection.scale(1).translate([0, 0]);
  let b = path.bounds(stateData);
  var s = .9 / Math.max((b[1][0] - b[0][0]) / mapWidth, (b[1][1] -
    b[0][1]) / mapHeight);
  var t = [(mapWidth - s * (b[1][0] + b[0][0])) / 2, (mapHeight - s *
    (b[1][1] + b[0][1])) / 2];
  projection.scale(s).translate(t);

  let colorScale = d3.scaleThreshold() //scaleQuantile
    .domain([1, 2, 4, 8, 16, 24])
    // .range(d3.schemeOrRd[6])
    // .range(["#fef0d9","#b30000"]);
    // .range(["#fef0d9","#fdd49e","#fdbb84","#fc8d59","#e34a33","#b30000"]);
    .range(["#ffffff","#fef0d9","#fdcc8a","#fc8d59","#e34a33","#b30000"]);

  let svg = d3.select("#map")
    .append("svg")
      .attr("width", mapWidth)
      .attr("height", mapHeight)
  
  svg.selectAll("path")
    .data(stateData.features)
    .enter()
    .append("path")
      .attr("d", path)
      .style("fill", function (d) {
        let state = d.properties.stateName;
        return colorScale(getShootingRate(currentYear, state, shootingData, populationData));
      })
      .style("stroke", "#000")
      .on("click", showDetails)

  // add a legend
  svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(20, 40)");

  let legendLinear = d3.legendColor()
    .scale(colorScale)
    .shapeWidth(40)
    .orient('vertical')
    .cells(6)
    .title("Legend")
    .labels(["0 < 1", "1 < 2", "2 < 4", "4 < 8", "8 < 16", "16 < 24"]);

  svg.select(".legend")
    .call(legendLinear);
}

function getShootingRate(year, state, shootingData, populationData) {
  let shootingCount = 0;
  if (shootingData[year][state]) {
    shootingCount = shootingData[year][state].length;
  }
  let population = populationData[state]["POPESTIMATE20" + year];
  let shootingRate = (shootingCount / population) * 1000000; // shootings per 1,000,000 people
  // console.log(`${state}: count: ${shootingCount} population: ${population} rate: ${shootingRate}`);
  return shootingRate;
}

function drawChart(state, stateUpper) {
  if (lineChart) {
    lineChart.destroy();
  }

  let years = Object.keys(shootingData);
  let formattedYears = years.map(item => `20${item}`);
  let statistics = {
    "incidents": [],
    "deaths": [],
    "injuries": []
  }
  for (let year of years) {
    console.log(year);
    let {totalIncidents, totalKilled, totalInjuries, population} = calculateStatistics(year, state);
    statistics.incidents.push(totalIncidents);
    statistics.deaths.push(totalKilled);
    statistics.injuries.push(totalInjuries);
  }
  console.log(statistics);

  lineChart = new Chart(document.getElementById("line-chart"), {
    type: "line",
    data: {
      labels: formattedYears,
      datasets: [{
        data: statistics.incidents,
        label: "incidents",
        borderColor: "#FFFFFF",
        fill: false
      },
      {
        data: statistics.deaths,
        label: "fatalities",
        borderColor: "#000000",
        fill: false
      },
      {
        data: statistics.injuries,
        label: "injuries",
        borderColor: "#FB0000",
        fill: false
      },
    ]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: `Mass shooting statistics from 2016 to 2021 in ${stateUpper} state`
        },
      },
      responsive: true,
      maintainAspectRatio: false
    }
  });
}