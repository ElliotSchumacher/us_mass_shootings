"use strict"

window.addEventListener("load", drawMap);

function drawMap() {
  Promise.all([d3.json("./data/usState.geojson"), 
    d3.csv("./data/mass_shootings_shrunk.csv"),
    d3.csv("./data/population.csv")])
    .then(processData)
    .then(createMap)
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
  // Process the stateData by making state names lowercase
  for (let state of stateData.features) {
    state.name = state.properties.name.toLowerCase();
  }

  // Process the populationData by making state names lowercase
  for (let state of populationData) {
    state.NAME = state.NAME.toLowerCase();
  }
  let mappedPopulationData = populationData.map((item) => ({[item.NAME]: item}));
  let processedPopulationData = Object.assign({}, ...mappedPopulationData);
  // Process the shootingData by making state names lowercase and grouping data by year
  let shootingByYear = {};
  for (let shooting of shootingData) {
    shooting.State = shooting.State.toLowerCase();
    let year = shooting["Incident Date"].split("-")[2];
    let state = shooting.State;
    if (!shootingByYear[year]) {
      shootingByYear[year] = {};
    }
    if (!shootingByYear[year][state]) {
      shootingByYear[year][state] = [];
    }
    shootingByYear[year][state].push(shooting)
  }

  // Create list of states
  let stateList = stateData.features.map((d) => { return d.properties.name.toLowerCase() })
  // console.log("stateList", stateList);
  // console.log("shootingByYear", shootingByYear);
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
        let state = d.name;
        let shootingRate = getShootingRate("21", state, shootingData, populationData);
        return colorScale(shootingRate);
      })
      .style("stroke", "#000")
      .on("click", swapViews)
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