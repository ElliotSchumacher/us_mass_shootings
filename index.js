"use strict"

window.addEventListener("load", init);

let inMapView;
let stateData, stateList, shootingData, populationData;

async function init() {
  inMapView = true;
  [stateData, stateList, shootingData, populationData] = await Promise.all([d3.json("./data/usState.geojson"), 
    d3.csv("./data/mass_shootings_shrunk.csv"),
    d3.csv("./data/population.csv")])
    .then(processData)
    .catch(console.error)
  
    await createMap([stateData, stateList, shootingData, populationData]);
}

/**
 * Populates the info panel with state information and the state's mass shooting statistics.
 * @param {Object} clickedState -  The GeoJSON feature of the state to show info on.
 */
  // Swap to detail view if not aready there
  if (inMapView) {
    swapViews();
    inMapView = !inMapView;
  }
  let state = clickedState.properties.stateName;

  // Update info pane header
  let stateLabel = document.querySelector("#info h2");
  stateLabel.innerHTML = clickedState.properties.name;
  
  // Populate statistics in info panel
  let {totalIncidents, totalKilled, totalInjuries, population} = calculateStatistics("21", state); 
  document.getElementById("incident-rate").innerHTML = ((totalIncidents / population) * 1000000).toFixed(1); // rate per million
  document.getElementById("incident-total").innerHTML = totalIncidents;
  document.getElementById("fatalities-rate").innerHTML = ((totalKilled / population) * 1000000).toFixed(1); // rate per million
  document.getElementById("fatalities-total").innerHTML = totalKilled;
  document.getElementById("injuries-rate").innerHTML = ((totalInjuries / population) * 1000000).toFixed(1); // rate per million
  document.getElementById("injuries-total").innerHTML = totalInjuries;
  document.getElementById("population-total").innerHTML = parseInt(population).toLocaleString();
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
 * Swaps between the map and detail view.
 */
function swapViews() {
  document.getElementById("info").classList.toggle("hidden");
  document.getElementById("chart").classList.toggle("hidden");
  document.getElementById("map").classList.toggle("shrink")
}

/**
 * Calculates and returns width of the map container.
 * @returns {int} - the width of the map container contents
 */
function getMapWidth() {
  let map = document.getElementById("map");
  let styles = getComputedStyle(map)
  return Math.floor(map.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight));
}

/**
 * Calculates and return the height of the map container.
 * @returns {int} - the height of the map contain contents
 */
function getMapHeight() {
  let map = document.getElementById("map");
  let styles = getComputedStyle(map)
  return Math.floor(map.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom));
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
  return [stateData, stateList, shootingByYear, processedPopulationData];
}

function createMap([stateData, stateList, shootingData, populationData]) {
  for (let state of stateList) {
    getShootingRate("21", state, shootingData, populationData);
  }

  // Remove existing SVG so that new map can be drawn
  let preexistingSVG = document.querySelector("svg");
  if (preexistingSVG) {
    preexistingSVG.remove();
  }

  // Setup map properties
  let mapHeight = getMapHeight();
  let mapWidth = getMapWidth();
  let projection = d3.geoAlbersUsa();
  let path = d3.geoPath().projection(projection);

  let colorScale = d3.scaleLinear()
    .domain([0, 1, 2, 4, 8, 24])
    .range(["#fee5d9","#fcbba1","#fc9272","#fb6a4a","#de2d26","#a50f15"]);

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
        return colorScale(getShootingRate("21", state, shootingData, populationData));
      })
      .style("stroke", "#000")
      .on("click", showDetails)
}

function getShootingRate(year, state, shootingData, populationData) {
  let shootingCount = 0;
  if (shootingData[year][state]) {
    shootingCount = shootingData[year][state].length;
  }
  let population = populationData[state]["POPESTIMATE20" + year];
  let shootingRate = (shootingCount / population) * 1000000; // shootings per 1,000,000 people
  return shootingRate;
}