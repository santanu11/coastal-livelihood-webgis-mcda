// ============================================================================
// CLOUD-BASED WEBGIS–MCDA
// LIVELIHOOD SUITABILITY ASSESSMENT
// INDIAN SUNDARBANS / CANNING STUDY AREA
//
// FINAL 12-CRITERION FRAMEWORK
//
// MODEL 1 — DIRECT FUZZY
//   P = Positive linear min-max membership
//   N = Negative linear min-max membership
//   C = Categorical membership
//
// MODEL 2 — EXPLICIT RANK
//   S3 = Highly Suitable     = 1.000
//   S2 = Moderately Suitable = 0.667
//   S1 = Marginally Suitable = 0.333
//   S0 = Not Suitable        = 0.000
//
// BOTH MODELS:
//   12 criteria
//   livelihood-specific FAHP weights
//   Weighted Linear Combination (WLC)
//
// FINAL LSI CLASSES:
//   >= 0.80       S3
//   0.60–<0.80    S2
//   0.40–<0.60    S1
//   0.20–<0.40    N1
//   <0.20         N2
// ============================================================================


// ============================================================================
// 1. STUDY AREA AND GLOBAL SETTINGS
// ============================================================================

var studyArea = ee.FeatureCollection(
  "projects/ee-santanughosh974/assets/Study_19_cd"
);

var studyGeometry = studyArea.geometry();

var studyMask = ee.Image.constant(1)
  .clip(studyGeometry)
  .selfMask();

var ANALYSIS_SCALE = 30;
var ANALYSIS_CRS = "EPSG:32645";
var MAX_PIXELS = 1e13;


// ============================================================================
// 2. FIXED CRITERION ORDER
// ============================================================================

var BAND_NAMES = [
  "A_Elevation",
  "B_Slope",
  "C_SOC",
  "D_Soil_Texture",
  "E_CRSI",
  "F_Surface_Water",
  "G_Distance_Coast",
  "H_Distance_Mangrove",
  "I_LULC",
  "J_Rainfall_CV",
  "K_Cyclone_Density",
  "L_Distance_Town"
];

var LIVELIHOODS = [
  "Agriculture",
  "Aquaculture",
  "Apiculture",
  "IFS"
];


// ============================================================================
// 3. FAHP NORMALIZED WEIGHTS
// ============================================================================

var WEIGHTS = {
  Agriculture: [
    0.086, 0.073, 0.171, 0.182, 0.136, 0.103,
    0.042, 0.042, 0.053, 0.047, 0.025, 0.041
  ],
  Aquaculture: [
    0.170, 0.154, 0.028, 0.088, 0.111, 0.158,
    0.057, 0.025, 0.057, 0.050, 0.042, 0.058
  ],
  Apiculture: [
    0.069, 0.043, 0.023, 0.019, 0.030, 0.115,
    0.096, 0.147, 0.215, 0.082, 0.090, 0.072
  ],
  IFS: [
    0.093, 0.044, 0.085, 0.081, 0.082, 0.221,
    0.093, 0.026, 0.147, 0.045, 0.058, 0.025
  ]
};

function normalizeWeights(weights) {
  var total = weights.reduce(function(sum, value) {
    return sum + value;
  }, 0);
  return weights.map(function(value) {
    return value / total;
  });
}

Object.keys(WEIGHTS).forEach(function(livelihood) {
  WEIGHTS[livelihood] = normalizeWeights(WEIGHTS[livelihood]);
});

print("FAHP normalized weights", WEIGHTS);


// ============================================================================
// 4. EXTERNAL USER ASSETS (LOADED AS ee.Image)
// ============================================================================

var COASTLINE_ASSET       = "projects/ee-santanughosh974/assets/G_Distance_Coast";
var CYCLONE_DENSITY_ASSET = "projects/ee-santanughosh974/assets/K_Cyclone_Density";
var TOWN_ASSET            = "projects/ee-santanughosh974/assets/L_Distance_Town";
var MANGROVE_DISTANCE_ASSET = "projects/ee-santanughosh974/assets/Distance_to_Mangroves";
var distanceCoastRaw = ee.Image(COASTLINE_ASSET)
  .select(0)
  .clip(studyGeometry)
  .rename("Distance_Coast")
  .toFloat();

var cycloneRaw = ee.Image(CYCLONE_DENSITY_ASSET)
  .select(0)
  .clip(studyGeometry)
  .rename("Cyclone_Density")
  .toFloat();

var townImage = ee.Image(TOWN_ASSET).select(0);
var distanceTownRaw = townImage
  .clip(studyGeometry)
  .rename("Distance_Town_km")
  .toFloat();


// ============================================================================
// 5. RAW DATA PREPARATION
// ============================================================================

// 5.1 A — ELEVATION
var elevationRaw = ee.Image("MERIT/DEM/v1_0_3")
  .select("dem")
  .clip(studyGeometry)
  .toFloat();

// 5.2 B — SLOPE
var elevationProjected = elevationRaw.reproject({
  crs: ANALYSIS_CRS,
  scale: ANALYSIS_SCALE
});

var slopeRaw = ee.Terrain.slope(elevationProjected)
  .clip(studyGeometry)
  .rename("Slope")
  .toFloat();

// 5.3 C — SOIL ORGANIC CARBON
var socRaw = ee.Image("OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02")
  .select("b30")
  .clip(studyGeometry)
  .toFloat();

// 5.4 D — SOIL TEXTURE
var soilTextureRaw = ee.Image("OpenLandMap/SOL/SOL_TEXTURE-CLASS_USDA-TT_M/v02")
  .select("b30")
  .clip(studyGeometry)
  .toInt16();

// 5.5 E — CANOPY SALINITY INDEX (CRSI)
var s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
  .filterBounds(studyGeometry)
  .filterDate("2021-01-01", "2026-01-01")
  .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", 30))
  .map(function(image) {
    var scl = image.select("SCL");
    var valid = scl.eq(4).or(scl.eq(5)).or(scl.eq(6));
    return image.updateMask(valid)
      .select(["B2", "B3", "B4", "B8"])
      .divide(10000);
  })
  .median()
  .clip(studyGeometry);

var crsiNumerator = s2.select("B8").multiply(s2.select("B4"))
  .subtract(s2.select("B3").multiply(s2.select("B2")));

var crsiDenominator = s2.select("B8").multiply(s2.select("B4"))
  .add(s2.select("B3").multiply(s2.select("B2")))
  .add(0.0001);

var crsiRaw = crsiNumerator.divide(crsiDenominator)
  .max(0)
  .sqrt()
  .rename("CRSI")
  .toFloat()
  .updateMask(studyMask);

// 5.6 F — SURFACE WATER OCCURRENCE
var surfaceWaterRaw = ee.Image("JRC/GSW1_4/GlobalSurfaceWater")
  .select("occurrence")
  .unmask(0)
  .clip(studyGeometry)
  .toFloat();

// 5.7 H — DISTANCE TO MANGROVE FOREST

var distanceMangroveRaw = ee.Image(
  MANGROVE_DISTANCE_ASSET
)
  .select(0)
  .clip(studyGeometry)
  .rename("Distance_Mangrove")
  .toFloat();

// 5.8 I — LULC
var lulcRaw = ee.ImageCollection("GOOGLE/DYNAMICWORLD/V1")
  .filterBounds(studyGeometry)
  .filterDate("2023-01-01", "2024-01-01")
  .select("label")
  .mode()
  .clip(studyGeometry)
  .toInt16();

// 5.9 J — RAINFALL COEFFICIENT OF VARIATION
var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
  .filterBounds(studyGeometry)
  .filterDate("2006-01-01", "2026-01-01")
  .select("precipitation");

var years = ee.List.sequence(2006, 2025);

var annualRainfall = ee.ImageCollection.fromImages(
  years.map(function(year) {
    year = ee.Number(year);
    return chirps.filter(ee.Filter.calendarRange(year, year, "year"))
      .sum()
      .rename("Annual_Rainfall");
  })
);

var rainfallCVRaw = annualRainfall.reduce(ee.Reducer.stdDev())
  .divide(annualRainfall.mean())
  .multiply(100)
  .rename("Rainfall_CV")
  .clip(studyGeometry)
  .toFloat();


// ============================================================================
// 6. DIRECT FUZZY FUNCTIONS
// ============================================================================

function fuzzyPositive(image, low, high) {
  return ee.Image(image)
    .subtract(low)
    .divide(ee.Number(high).subtract(low))
    .clamp(0, 1)
    .toFloat()
    .updateMask(studyMask);
}

function fuzzyNegative(image, low, high) {
  return ee.Image(image)
    .subtract(low)
    .divide(ee.Number(high).subtract(low))
    .multiply(-1)
    .add(1)
    .clamp(0, 1)
    .toFloat()
    .updateMask(studyMask);
}

function categoricalMembership(image, classes, values) {
  return ee.Image(image)
    .remap(classes, values, 0)
    .toFloat()
    .updateMask(studyMask);
}


// ============================================================================
// 7. DIRECT FUZZY STANDARDIZATION
// ============================================================================

var DIRECT_RANGE = {
  Elevation:    { low: -12.20,   high: 20.23 },
  Slope:        { low: 0.00,     high: 6.89 },
  SOC:          { low: 0.00,     high: 43.00 },
  CRSI:         { low: 0.00,     high: 0.92 },
  SurfaceWater: { low: 0.00,     high: 100.00 },
  Coast:        { low: 0.00,     high: 16416.60 },
  Mangrove:     { low: 0.00,     high: 56161.90 },
  RainfallCV:   { low: 14.9859,  high: 17.2988 },
  Cyclone:      { low: 0.00,     high: 0.607443 },
  Town:         { low: 2.00,     high: 120.00 }
};

function directSoilAgriculture() {
  return categoricalMembership(
    soilTextureRaw,
    [1,2,3,4,5,6,7,8,9,10,11,12],
    [0.000, 0.000, 0.000, 0.667, 0.667, 1.000, 0.333, 0.667, 0.000, 0.667, 0.000, 0.000]
  );
}

function directSoilAquaculture() {
  return categoricalMembership(
    soilTextureRaw,
    [1,2,3,4,5,6,7,8,9,10,11,12],
    [0.000, 0.000, 0.000, 0.667, 0.667, 0.667, 0.667, 0.667, 0.000, 0.667, 1.000, 0.000]
  );
}

function directSoilApiculture() {
  return categoricalMembership(
    soilTextureRaw,
    [1,2,3,4,5,6,7,8,9,10,11,12],
    [0.000, 0.000, 0.000, 0.667, 0.000, 0.667, 0.333, 0.333, 0.000, 0.333, 1.000, 1.000]
  );
}

function directSoilIFS() {
  return categoricalMembership(
    soilTextureRaw,
    [1,2,3,4,5,6,7,8,9,10,11,12],
    [0.000, 0.000, 0.000, 0.667, 0.000, 0.667, 0.333, 0.667, 0.000, 0.667, 1.000, 1.000]
  );
}

function directLULCAgriculture() {
  return categoricalMembership(
    lulcRaw,
    [0,1,2,3,4,5,6,7,8],
    [0.000, 0.000, 0.667, 0.333, 1.000, 0.333, 0.000, 0.667, 0.000]
  );
}

function directLULCAquaculture() {
  return categoricalMembership(
    lulcRaw,
    [0,1,2,3,4,5,6,7,8],
    [1.000, 0.200, 0.400, 1.000, 1.000, 0.400, 0.000, 0.600, 0.000]
  );
}

function directLULCAapiculture() {
  return categoricalMembership(
    lulcRaw,
    [0,1,2,3,4,5,6,7,8],
    [0.000, 1.000, 0.667, 0.667, 0.333, 0.667, 0.000, 0.333, 0.000]
  );
}

function directLULCIFS() {
  return categoricalMembership(
    lulcRaw,
    [0,1,2,3,4,5,6,7,8],
    [0.667, 0.667, 0.667, 1.000, 1.000, 0.667, 0.000, 0.667, 0.000]
  );
}

function buildDirect(livelihood) {
  var A, B, C, D, E, F, G, H, I, J, K, L;
  var r = DIRECT_RANGE;

  if (livelihood === "Agriculture") {
    A = fuzzyPositive(elevationRaw, r.Elevation.low, r.Elevation.high);
    B = fuzzyNegative(slopeRaw, r.Slope.low, r.Slope.high);
    C = fuzzyPositive(socRaw, r.SOC.low, r.SOC.high);
    D = directSoilAgriculture();
    E = fuzzyPositive(crsiRaw, r.CRSI.low, r.CRSI.high);
    F = fuzzyNegative(surfaceWaterRaw, r.SurfaceWater.low, r.SurfaceWater.high);
    G = fuzzyPositive(distanceCoastRaw, r.Coast.low, r.Coast.high);
    H = fuzzyPositive(distanceMangroveRaw, r.Mangrove.low, r.Mangrove.high);
    I = directLULCAgriculture();
    J = fuzzyNegative(rainfallCVRaw, r.RainfallCV.low, r.RainfallCV.high);
    K = fuzzyNegative(cycloneRaw, r.Cyclone.low, r.Cyclone.high);
    L = fuzzyNegative(distanceTownRaw, r.Town.low, r.Town.high);
  }

  if (livelihood === "Aquaculture") {
    A = fuzzyNegative(elevationRaw, r.Elevation.low, r.Elevation.high);
    B = fuzzyNegative(slopeRaw, r.Slope.low, r.Slope.high);
    C = fuzzyNegative(socRaw, r.SOC.low, r.SOC.high);
    D = directSoilAquaculture();
    E = fuzzyPositive(crsiRaw, r.CRSI.low, r.CRSI.high);
    F = fuzzyPositive(surfaceWaterRaw, r.SurfaceWater.low, r.SurfaceWater.high);
    G = fuzzyNegative(distanceCoastRaw, r.Coast.low, r.Coast.high);
    H = fuzzyPositive(distanceMangroveRaw, r.Mangrove.low, r.Mangrove.high);
    I = directLULCAquaculture();
    J = fuzzyNegative(rainfallCVRaw, r.RainfallCV.low, r.RainfallCV.high);
    K = fuzzyNegative(cycloneRaw, r.Cyclone.low, r.Cyclone.high);
    L = fuzzyNegative(distanceTownRaw, r.Town.low, r.Town.high);
  }

  if (livelihood === "Apiculture") {
    A = fuzzyPositive(elevationRaw, r.Elevation.low, r.Elevation.high);
    B = fuzzyNegative(slopeRaw, r.Slope.low, r.Slope.high);
    C = fuzzyPositive(socRaw, r.SOC.low, r.SOC.high);
    D = directSoilApiculture();
    E = fuzzyPositive(crsiRaw, r.CRSI.low, r.CRSI.high);
    F = fuzzyNegative(surfaceWaterRaw, r.SurfaceWater.low, r.SurfaceWater.high);
    G = fuzzyNegative(distanceCoastRaw, r.Coast.low, r.Coast.high);
    H = fuzzyNegative(distanceMangroveRaw, r.Mangrove.low, r.Mangrove.high);
    I = directLULCAapiculture();
    J = fuzzyNegative(rainfallCVRaw, r.RainfallCV.low, r.RainfallCV.high);
    K = fuzzyNegative(cycloneRaw, r.Cyclone.low, r.Cyclone.high);
    L = fuzzyNegative(distanceTownRaw, r.Town.low, r.Town.high);
  }

  if (livelihood === "IFS") {
    A = fuzzyPositive(elevationRaw, r.Elevation.low, r.Elevation.high);
    B = fuzzyNegative(slopeRaw, r.Slope.low, r.Slope.high);
    C = fuzzyPositive(socRaw, r.SOC.low, r.SOC.high);
    D = directSoilIFS();
    E = fuzzyPositive(crsiRaw, r.CRSI.low, r.CRSI.high);
    F = fuzzyNegative(surfaceWaterRaw, r.SurfaceWater.low, r.SurfaceWater.high);
    G = fuzzyPositive(distanceCoastRaw, r.Coast.low, r.Coast.high);
    H = fuzzyPositive(distanceMangroveRaw, r.Mangrove.low, r.Mangrove.high);
    I = directLULCIFS();
    J = fuzzyNegative(rainfallCVRaw, r.RainfallCV.low, r.RainfallCV.high);
    K = fuzzyNegative(cycloneRaw, r.Cyclone.low, r.Cyclone.high);
    L = fuzzyNegative(distanceTownRaw, r.Town.low, r.Town.high);
  }

  return ee.Image.cat([
    A.rename("A_Elevation"),
    B.rename("B_Slope"),
    C.rename("C_SOC"),
    D.rename("D_Soil_Texture"),
    E.rename("E_CRSI"),
    F.rename("F_Surface_Water"),
    G.rename("G_Distance_Coast"),
    H.rename("H_Distance_Mangrove"),
    I.rename("I_LULC"),
    J.rename("J_Rainfall_CV"),
    K.rename("K_Cyclone_Density"),
    L.rename("L_Distance_Town")
  ]).clamp(0, 1).toFloat().updateMask(studyMask);
}


// ============================================================================
// 8. EXPLICIT RANK FUNCTIONS
// ============================================================================

var RANK_S3 = 1.000;
var RANK_S2 = 0.667;
var RANK_S1 = 0.333;
var RANK_S0 = 0.000;

function rankImage(s3Condition, s2Condition, s1Condition) {
  var result = ee.Image.constant(RANK_S0).clip(studyGeometry);
  result = result.where(s1Condition, RANK_S1);
  result = result.where(s2Condition, RANK_S2);
  result = result.where(s3Condition, RANK_S3);
  return result.toFloat().updateMask(studyMask);
}

function rankCategorical(image, s3Classes, s2Classes, s1Classes) {
  var fromClasses = s3Classes.concat(s2Classes).concat(s1Classes);
  var toValues = ee.List.repeat(RANK_S3, s3Classes.length)
    .cat(ee.List.repeat(RANK_S2, s2Classes.length))
    .cat(ee.List.repeat(RANK_S1, s1Classes.length));

  return ee.Image(image)
    .remap(fromClasses, toValues, RANK_S0)
    .toFloat()
    .updateMask(studyMask);
}


// ============================================================================
// 9. EXPLICIT RANK STANDARDIZATION
// ============================================================================

function buildRank(livelihood) {
  var A, B, C, D, E, F, G, H, I, J, K, L;

  if (livelihood === "Agriculture") {
    A = rankImage(
      elevationRaw.gt(2).and(elevationRaw.lte(5)),
      elevationRaw.gt(5).and(elevationRaw.lte(10)),
      elevationRaw.gt(10).and(elevationRaw.lte(20))
    );
    B = rankImage(
      slopeRaw.gte(0).and(slopeRaw.lt(2)),
      slopeRaw.gte(2).and(slopeRaw.lt(4)),
      slopeRaw.gte(4).and(slopeRaw.lt(5))
    );
   C = rankImage(
  socRaw.gte(20),                                  // S3 = 1.000
  socRaw.gte(15).and(socRaw.lt(20)),               // S2 = 0.667
  socRaw.gte(5).and(socRaw.lt(15))                 // S1 = 0.333
);
    D = rankCategorical(soilTextureRaw, [6], [4,5,8,10], [7]);
    E = rankImage(
      crsiRaw.gt(0.60),
      crsiRaw.gte(0.40).and(crsiRaw.lte(0.60)),
      crsiRaw.gte(0.20).and(crsiRaw.lt(0.40))
    );
    F = rankImage(
      surfaceWaterRaw.gte(0).and(surfaceWaterRaw.lt(10)),
      surfaceWaterRaw.gte(10).and(surfaceWaterRaw.lt(20)),
      surfaceWaterRaw.gte(20).and(surfaceWaterRaw.lt(40))
    );
   G = rankImage(
  distanceCoastRaw.gte(4000),
  distanceCoastRaw.gte(3000).and(distanceCoastRaw.lt(4000)),
  distanceCoastRaw.gte(1000).and(distanceCoastRaw.lt(3000))
);
  H = rankImage(
  distanceMangroveRaw.gte(4),
  distanceMangroveRaw.gte(2).and(distanceMangroveRaw.lt(4)),
  distanceMangroveRaw.gte(0.5).and(distanceMangroveRaw.lt(2))
);
    I = rankCategorical(lulcRaw, [4], [2,7], [3,5]);
    J = rankImage(
      rainfallCVRaw.lt(15.50),
      rainfallCVRaw.gte(15.50).and(rainfallCVRaw.lt(16.10)),
      rainfallCVRaw.gte(16.10).and(rainfallCVRaw.lt(16.77))
    );
    K = rankImage(
      cycloneRaw.gte(0).and(cycloneRaw.lt(0.10)),
      cycloneRaw.gte(0.10).and(cycloneRaw.lt(0.20)),
      cycloneRaw.gte(0.20).and(cycloneRaw.lt(0.30))
    );
    L = rankImage(
      distanceTownRaw.gte(2).and(distanceTownRaw.lt(30)),
      distanceTownRaw.gte(30).and(distanceTownRaw.lt(50)),
      distanceTownRaw.gte(50).and(distanceTownRaw.lt(80))
    );
  }

  if (livelihood === "Aquaculture") {
    A = rankImage(
      elevationRaw.gte(0).and(elevationRaw.lte(2)),
      elevationRaw.gt(2).and(elevationRaw.lte(5)),
      elevationRaw.gt(5).and(elevationRaw.lte(10))
    );
    B = rankImage(
      slopeRaw.gte(0).and(slopeRaw.lt(3)),
      slopeRaw.gte(3).and(slopeRaw.lt(5)),
      slopeRaw.gte(5).and(slopeRaw.lt(6))
    );
    C = rankImage(
      socRaw.gte(0).and(socRaw.lt(3)),
      socRaw.gte(3).and(socRaw.lt(5)),
      socRaw.gte(5).and(socRaw.lt(10))
    );
    D = rankCategorical(soilTextureRaw, [11], [4,5,6,7,8,10], [9]);
    E = rankImage(
      crsiRaw.gt(0.60),
      crsiRaw.gte(0.40).and(crsiRaw.lte(0.60)),
      crsiRaw.gte(0.20).and(crsiRaw.lt(0.40))
    );
    F = rankImage(
      surfaceWaterRaw.gte(50),
      surfaceWaterRaw.gte(25).and(surfaceWaterRaw.lt(50)),
      surfaceWaterRaw.gte(10).and(surfaceWaterRaw.lt(25))
    );
    G = rankImage(
      distanceCoastRaw.gte(0).and(distanceCoastRaw.lt(1000)),
      distanceCoastRaw.gte(1000).and(distanceCoastRaw.lt(2000)),
      distanceCoastRaw.gte(2000).and(distanceCoastRaw.lt(5000))
    );
    H = rankImage(
      distanceMangroveRaw.gte(2000).and(distanceMangroveRaw.lt(5000)),
      distanceMangroveRaw.gte(5000).and(distanceMangroveRaw.lt(10000)),
      distanceMangroveRaw.gte(100).and(distanceMangroveRaw.lt(2000))
    );
    I = rankCategorical(lulcRaw, [0,3,4], [7,2,5], [1]);
    J = rankImage(
      rainfallCVRaw.lt(15.50),
      rainfallCVRaw.gte(15.50).and(rainfallCVRaw.lt(16.10)),
      rainfallCVRaw.gte(16.10).and(rainfallCVRaw.lt(16.77))
    );
    K = rankImage(
      cycloneRaw.gte(0).and(cycloneRaw.lt(0.10)),
      cycloneRaw.gte(0.10).and(cycloneRaw.lt(0.20)),
      cycloneRaw.gte(0.20).and(cycloneRaw.lt(0.30))
    );
    L = rankImage(
      distanceTownRaw.gte(2).and(distanceTownRaw.lt(20)),
      distanceTownRaw.gte(20).and(distanceTownRaw.lt(40)),
      distanceTownRaw.gte(40).and(distanceTownRaw.lt(60))
    );
  }

  if (livelihood === "Apiculture") {
    A = rankImage(
      elevationRaw.gte(2).and(elevationRaw.lt(5)),
      elevationRaw.gte(5).and(elevationRaw.lt(10)),
      elevationRaw.gte(10).and(elevationRaw.lt(15))
    );
    B = rankImage(
      slopeRaw.gte(0).and(slopeRaw.lt(2)),
      slopeRaw.gte(2).and(slopeRaw.lt(4)),
      slopeRaw.gte(4).and(slopeRaw.lt(6))
    );
    C = rankImage(
      socRaw.gte(10).and(socRaw.lt(20)),
      socRaw.gte(5).and(socRaw.lt(10)),
      socRaw.gte(1.5).and(socRaw.lt(5))
    );
    D = rankCategorical(soilTextureRaw, [11,12], [6,4], [7,8,10]);
    E = rankImage(
      crsiRaw.gt(0.60),
      crsiRaw.gte(0.40).and(crsiRaw.lte(0.60)),
      crsiRaw.gte(0.20).and(crsiRaw.lt(0.40))
    );
    F = rankImage(
      surfaceWaterRaw.gte(0).and(surfaceWaterRaw.lt(5)),
      surfaceWaterRaw.gte(5).and(surfaceWaterRaw.lt(15)),
      surfaceWaterRaw.gte(15).and(surfaceWaterRaw.lt(25))
    );
    G = rankImage(
  distanceCoastRaw.gte(1000).and(distanceCoastRaw.lt(3000)),      // S3 = 1.000
  distanceCoastRaw.gte(3000).and(distanceCoastRaw.lt(5000)),  // S2 = 0.667
  distanceCoastRaw.gte(5000).and(distanceCoastRaw.lt(16000))   // S1 = 0.333
);
    H = rankImage(
      distanceMangroveRaw.gte(0).and(distanceMangroveRaw.lt(1000)),
      distanceMangroveRaw.gte(1000).and(distanceMangroveRaw.lt(5000)),
      distanceMangroveRaw.gte(5000).and(distanceMangroveRaw.lt(10000))
    );
    I = rankCategorical(lulcRaw, [1,3,5], [2,4], [7]);
    J = rankImage(
      rainfallCVRaw.lt(15.50),
      rainfallCVRaw.gte(15.50).and(rainfallCVRaw.lt(16.10)),
      rainfallCVRaw.gte(16.10).and(rainfallCVRaw.lt(16.77))
    );
    K = rankImage(
      cycloneRaw.gte(0).and(cycloneRaw.lt(0.05)),
      cycloneRaw.gte(0.05).and(cycloneRaw.lt(0.10)),
      cycloneRaw.gte(0.10).and(cycloneRaw.lt(0.20))
    );
    L = rankImage(
      distanceTownRaw.gte(0).and(distanceTownRaw.lt(30)),
      distanceTownRaw.gte(30).and(distanceTownRaw.lt(60)),
      distanceTownRaw.gte(60).and(distanceTownRaw.lt(140))
    );
  }

  if (livelihood === "IFS") {
    A = rankImage(
      elevationRaw.gte(1).and(elevationRaw.lte(3)),
      elevationRaw.gt(3).and(elevationRaw.lte(10)),
      elevationRaw.gt(10).and(elevationRaw.lte(20))
    );
    B = rankImage(
      slopeRaw.gte(0).and(slopeRaw.lt(2)),
      slopeRaw.gte(2).and(slopeRaw.lt(4)),
      slopeRaw.gte(4).and(slopeRaw.lt(5))
    );
    C = rankImage(
      socRaw.gte(5).and(socRaw.lt(10)),
      socRaw.gte(10).and(socRaw.lt(15)),
      socRaw.gte(15)
    );
    D = rankCategorical(soilTextureRaw, [11,12], [8,10,6], [7,4]);
    E = rankImage(
      crsiRaw.gt(0.60),
      crsiRaw.gte(0.40).and(crsiRaw.lte(0.60)),
      crsiRaw.gte(0.20).and(crsiRaw.lt(0.40))
    );
    F = rankImage(
      surfaceWaterRaw.gte(0).and(surfaceWaterRaw.lt(20)),
      surfaceWaterRaw.gte(20).and(surfaceWaterRaw.lt(40)),
      surfaceWaterRaw.gte(40).and(surfaceWaterRaw.lt(70))
    );
    G = rankImage(
      distanceCoastRaw.gte(2000).and(distanceCoastRaw.lt(4000)),
      distanceCoastRaw.gte(4000).and(distanceCoastRaw.lt(15000)),
      distanceCoastRaw.gte(1000).and(distanceCoastRaw.lt(2000))
    );
    H = rankImage(
      distanceMangroveRaw.gte(1000).and(distanceMangroveRaw.lt(5000)),
      distanceMangroveRaw.gte(5000).and(distanceMangroveRaw.lt(10000)),
      distanceMangroveRaw.gte(500).and(distanceMangroveRaw.lt(1000))
    );
    I = rankCategorical(lulcRaw, [3,4], [1,2,5], [7]);
    J = rankImage(
      rainfallCVRaw.lt(15.50),
      rainfallCVRaw.gte(15.50).and(rainfallCVRaw.lt(16.10)),
      rainfallCVRaw.gte(16.10).and(rainfallCVRaw.lt(16.77))
    );
    K = rankImage(
      cycloneRaw.gte(0).and(cycloneRaw.lt(0.10)),
      cycloneRaw.gte(0.10).and(cycloneRaw.lt(0.20)),
      cycloneRaw.gte(0.20).and(cycloneRaw.lt(0.30))
    );
    L = rankImage(
      distanceTownRaw.gte(2).and(distanceTownRaw.lt(30)),
      distanceTownRaw.gte(30).and(distanceTownRaw.lt(60)),
      distanceTownRaw.gte(60).and(distanceTownRaw.lt(90))
    );
  }

  return ee.Image.cat([
    A.rename("A_Elevation"),
    B.rename("B_Slope"),
    C.rename("C_SOC"),
    D.rename("D_Soil_Texture"),
    E.rename("E_CRSI"),
    F.rename("F_Surface_Water"),
    G.rename("G_Distance_Coast"),
    H.rename("H_Distance_Mangrove"),
    I.rename("I_LULC"),
    J.rename("J_Rainfall_CV"),
    K.rename("K_Cyclone_Density"),
    L.rename("L_Distance_Town")
  ]).clamp(0, 1).toFloat().updateMask(studyMask);
}


// ============================================================================
// 10. BUILD BOTH MODELS
// ============================================================================

var DIRECT = {
  Agriculture: buildDirect("Agriculture"),
  Aquaculture: buildDirect("Aquaculture"),
  Apiculture:  buildDirect("Apiculture"),
  IFS:          buildDirect("IFS")
};

var RANK = {
  Agriculture: buildRank("Agriculture"),
  Aquaculture: buildRank("Aquaculture"),
  Apiculture:  buildRank("Apiculture"),
  IFS:          buildRank("IFS")
};


// ============================================================================
// 11. WEIGHTED LINEAR COMBINATION (WLC)
// ============================================================================

function weightImage(weights) {
  return ee.Image.constant(weights)
    .rename(BAND_NAMES)
    .toFloat()
    .updateMask(studyMask);
}

function calculateLSI(membershipStack, weights, outputName) {
  return ee.Image(membershipStack)
    .multiply(weightImage(weights))
    .reduce(ee.Reducer.sum())
    .rename(outputName)
    .clamp(0, 1)
    .toFloat()
    .updateMask(studyMask);
}

var DIRECT_LSI = {
  Agriculture: calculateLSI(DIRECT.Agriculture, WEIGHTS.Agriculture, "Agriculture_Direct_LSI"),
  Aquaculture: calculateLSI(DIRECT.Aquaculture, WEIGHTS.Aquaculture, "Aquaculture_Direct_LSI"),
  Apiculture:  calculateLSI(DIRECT.Apiculture,  WEIGHTS.Apiculture,  "Apiculture_Direct_LSI"),
  IFS:          calculateLSI(DIRECT.IFS,          WEIGHTS.IFS,          "IFS_Direct_LSI")
};

var RANK_LSI = {
  Agriculture: calculateLSI(RANK.Agriculture, WEIGHTS.Agriculture, "Agriculture_Rank_LSI"),
  Aquaculture: calculateLSI(RANK.Aquaculture, WEIGHTS.Aquaculture, "Aquaculture_Rank_LSI"),
  Apiculture:  calculateLSI(RANK.Apiculture,  WEIGHTS.Apiculture,  "Apiculture_Rank_LSI"),
  IFS:          calculateLSI(RANK.IFS,          WEIGHTS.IFS,          "IFS_Rank_LSI")
};


// ============================================================================
// 12. FINAL LSI CLASSIFICATION
// ============================================================================

function classifyLSI(lsi) {
  var result = ee.Image.constant(5).clip(studyGeometry);
  result = result.where(lsi.gte(0.20).and(lsi.lt(0.40)), 4);
  result = result.where(lsi.gte(0.40).and(lsi.lt(0.60)), 3);
  result = result.where(lsi.gte(0.60).and(lsi.lt(0.80)), 2);
  result = result.where(lsi.gte(0.80), 1);

  return result
    .rename("LSI_Class")
    .toByte()
    .updateMask(studyMask)
    .updateMask(lsi.mask());
}

var DIRECT_CLASS = {
  Agriculture: classifyLSI(DIRECT_LSI.Agriculture),
  Aquaculture: classifyLSI(DIRECT_LSI.Aquaculture),
  Apiculture:  classifyLSI(DIRECT_LSI.Apiculture),
  IFS:          classifyLSI(DIRECT_LSI.IFS)
};

var RANK_CLASS = {
  Agriculture: classifyLSI(RANK_LSI.Agriculture),
  Aquaculture: classifyLSI(RANK_LSI.Aquaculture),
  Apiculture:  classifyLSI(RANK_LSI.Apiculture),
  IFS:          classifyLSI(RANK_LSI.IFS)
};


// ============================================================================
// 13. BEST LIVELIHOOD
// ============================================================================

function getBestLivelihood(lsiObject) {
  var stack = ee.Image.cat([
    lsiObject.Agriculture,
    lsiObject.Aquaculture,
    lsiObject.IFS,
    lsiObject.Apiculture
  ]).rename([
    "Agriculture",
    "Aquaculture",
    "IFS",
    "Apiculture"
  ]);

  var maxLSI = stack.reduce(ee.Reducer.max());
  var viableMask = maxLSI.gt(0);

  // Tie priority:
  // Agriculture > Aquaculture > IFS > Apiculture
  var best = ee.Image.constant(0).clip(studyGeometry);

  best = best.where(
    lsiObject.Apiculture.eq(maxLSI),
    4
  );

  best = best.where(
    lsiObject.IFS.eq(maxLSI),
    3
  );

  best = best.where(
    lsiObject.Aquaculture.eq(maxLSI),
    2
  );

  best = best.where(
    lsiObject.Agriculture.eq(maxLSI),
    1
  );

  return best
    .rename("Best_Livelihood")
    .toByte()
    .updateMask(studyMask)
    .updateMask(viableMask);
}

var BEST_DIRECT = getBestLivelihood(DIRECT_LSI);
var BEST_RANK   = getBestLivelihood(RANK_LSI);


// ============================================================================
// 14. DIRECT VS RANK DIFFERENCE
// ============================================================================

var DIFFERENCE = {
  Agriculture: DIRECT_LSI.Agriculture.subtract(RANK_LSI.Agriculture).rename("Agriculture_Direct_minus_Rank"),
  Aquaculture: DIRECT_LSI.Aquaculture.subtract(RANK_LSI.Aquaculture).rename("Aquaculture_Direct_minus_Rank"),
  Apiculture:  DIRECT_LSI.Apiculture.subtract(RANK_LSI.Apiculture).rename("Apiculture_Direct_minus_Rank"),
  IFS:          DIRECT_LSI.IFS.subtract(RANK_LSI.IFS).rename("IFS_Direct_minus_Rank")
};

var AGREEMENT = {
  Agriculture: DIRECT_CLASS.Agriculture.eq(RANK_CLASS.Agriculture).rename("Agriculture_Agreement"),
  Aquaculture: DIRECT_CLASS.Aquaculture.eq(RANK_CLASS.Aquaculture).rename("Aquaculture_Agreement"),
  Apiculture:  DIRECT_CLASS.Apiculture.eq(RANK_CLASS.Apiculture).rename("Apiculture_Agreement"),
  IFS:          DIRECT_CLASS.IFS.eq(RANK_CLASS.IFS).rename("IFS_Agreement")
};


// ============================================================================
// 15. VISUALIZATION PALETTES
// ============================================================================
//
// COLOR SCHEME — CONSISTENT WITH PREVIOUS WORKING WEBGIS UI
//
// BEST LIVELIHOOD
//   Agriculture  = #1f78b4
//   Aquaculture  = #33a02c
//   Apiculture   = #ff7f00
//   IFS          = #6a3d9a
//
// SUITABILITY
//   S1 = #006400
//   S2 = #7fc97f
//   S3 = #ffff99
//   N1 = #fdc086
//   N2 = #d7191c
//
// BOUNDARY
//   Outer Boundary = #000000
// ============================================================================


// -----------------------------------------------------------------------------
// 15.1 CONTINUOUS LSI VISUALIZATION
// -----------------------------------------------------------------------------

var LSI_VIS = {
  min: 0,
  max: 1,
  palette: [
    "8c510a",
    "d8b365",
    "f6e8c3",
    "c7eae5",
    "5ab4ac",
    "01665e"
  ]
};


// -----------------------------------------------------------------------------
// 15.2 FINAL SUITABILITY CLASS VISUALIZATION
// -----------------------------------------------------------------------------

var CLASS_VIS = {
  min: 1,
  max: 5,
  palette: [
    "006400",   // S1 - Highly Suitable
    "7fc97f",   // S2 - Moderately Suitable
    "ffff99",   // S3 - Marginally Suitable
    "fdc086",   // N1 - Currently Not Suitable
    "d7191c"    // N2 - Permanently Not Suitable
  ]
};


// -----------------------------------------------------------------------------
// 15.3 BEST LIVELIHOOD VISUALIZATION
// -----------------------------------------------------------------------------

var BEST_VIS = {
  min: 1,
  max: 4,
  palette: [
    "33a02c",   // Agriculture
    "1f78b4",   // Aquaculture
    "6a3d9a",   // Apiculture
    "ff7f00"    // IFS
  ]
};


// ============================================================================
// 16. DIAGNOSTICS & EXPORTS
// ============================================================================

print("Criterion order", BAND_NAMES);
print("FAHP weights", WEIGHTS);

var exportRegion =
  studyGeometry.bounds();


function exportTiff(
  image,
  description
) {

  Export.image.toDrive({

    image:
      image,

    description:
      description,

    folder:
      "Sundarbans_WebGIS_MCDA",

    region:
      exportRegion,

    scale:
      ANALYSIS_SCALE,

    crs:
      ANALYSIS_CRS,

    maxPixels:
      MAX_PIXELS
  });
}


// -----------------------------------------------------------------------------
// DIRECT LSI EXPORTS
// -----------------------------------------------------------------------------

exportTiff(
  DIRECT_LSI.Agriculture,
  "DIRECT_Agriculture_LSI"
);

exportTiff(
  DIRECT_LSI.Aquaculture,
  "DIRECT_Aquaculture_LSI"
);

exportTiff(
  DIRECT_LSI.Apiculture,
  "DIRECT_Apiculture_LSI"
);

exportTiff(
  DIRECT_LSI.IFS,
  "DIRECT_IFS_LSI"
);


// -----------------------------------------------------------------------------
// RANK LSI EXPORTS
// -----------------------------------------------------------------------------

exportTiff(
  RANK_LSI.Agriculture,
  "RANK_Agriculture_LSI"
);

exportTiff(
  RANK_LSI.Aquaculture,
  "RANK_Aquaculture_LSI"
);

exportTiff(
  RANK_LSI.Apiculture,
  "RANK_Apiculture_LSI"
);

exportTiff(
  RANK_LSI.IFS,
  "RANK_IFS_LSI"
);


// -----------------------------------------------------------------------------
// BEST LIVELIHOOD EXPORTS
// -----------------------------------------------------------------------------

exportTiff(
  BEST_DIRECT,
  "BEST_LIVELIHOOD_DIRECT"
);

exportTiff(
  BEST_RANK,
  "BEST_LIVELIHOOD_RANK"
);
