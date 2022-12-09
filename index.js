"use strict"

/**
 * Swaps between the map and detail view.
 */
function swapViews() {
  document.getElementById("info").classList.toggle("hidden");
  document.getElementById("chart").classList.toggle("hidden");
  document.getElementById("map").classList.toggle("shrink")
}