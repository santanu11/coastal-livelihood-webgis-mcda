// CLIMATE-INFORMED COASTAL LIVELIHOOD DECISION SUPPORT SYSTEM (CL-DSS)
// 1. ASSETS
// =============================================================================

var studyArea = ee.FeatureCollection(
  'projects/ee-santanughosh974/assets/Study_19_cd'
);

var bestDirect = ee.Image(
  'projects/ee-santanughosh974/assets/BEST_LIVELIHOOD_DIRECT'
);

var bestRank = ee.Image(
  'projects/ee-santanughosh974/assets/BEST_LIVELIHOOD_RANK'
);

var lsi = {
  Direct: {
    Agriculture: ee.Image(
      'projects/ee-santanughosh974/assets/Direct_agri_LSI'
    ),
    Aquaculture: ee.Image(
      'projects/ee-santanughosh974/assets/DIRECT_Aquaculture_LSI'
    ),
    Apiculture: ee.Image(
      'projects/ee-santanughosh974/assets/DIRECT_Apiculture_LSI'
    ),
    IFS: ee.Image(
      'projects/ee-santanughosh974/assets/DIRECT_IFS_LSI'
    )
  },

  Rank: {
    Agriculture: ee.Image(
      'projects/ee-santanughosh974/assets/RANK_Agriculture_LSI'
    ),
    Aquaculture: ee.Image(
      'projects/ee-santanughosh974/assets/RANK_Aquaculture_LSI'
    ),
    Apiculture: ee.Image(
      'projects/ee-santanughosh974/assets/RANK_Apiculture_LSI'
    ),
    IFS: ee.Image(
      'projects/ee-santanughosh974/assets/RANK_IFS_LSI'
    )
  }
};


// =============================================================================
// 2. COLOUR SCHEMES & THRESHOLDS
// =============================================================================

// Best-livelihood raster codes:
// 1 = Agriculture, 2 = Aquaculture, 3 =IFS , 4 = Apiculture
var bestPalette = [
  '#2ca02c',
  '#168ac4',
  '#6a3d9a',
  '#ff8c00'
];
var bestNames = [
  'Agriculture',
  'Aquaculture',
  'Integrated Farming (IFS)',
  'Apiculture'
];
// FAO suitability display coding:
// 1 = S1, 2 = S2, 3 = S3, 4 = N1, 5 = N2
var suitabilityPalette = [
  '#006400',  // S1 - Highly Suitable (Dark Green)
  '#7fc97f',  // S2 - Moderately Suitable
  '#ffff99',  // S3 - Marginally Suitable
  '#fdc086',  // N1 - Currently Not Suitable
  '#d7191c'   // N2 - Permanently Not Suitable (Red)
];
var suitabilityNames = [
  'S1 — Highly Suitable',
  'S2 — Moderately Suitable',
  'S3 — Marginally Suitable',
  'N1 — Currently Not Suitable',
  'N2 — Permanently Not Suitable'
];
var suitabilityShortNames = ['S1', 'S2', 'S3', 'N1', 'N2'];
// =============================================================================
// 3. SUITABILITY CLASSIFICATION FUNCTIONS
// =============================================================================
// Source coding for BOTH Direct and Rank:
// 5 = S1, 4 = S2, 3 = S3, 2 = N1, 1 = N2
//
// Standard display coding:
// 1 = S1, 2 = S2, 3 = S3, 4 = N1, 5 = N2

function remapSuitability(image) {
  var source = image.select([0]);

  return source
    .remap(
      [5, 4, 3, 2, 1],
      [1, 2, 3, 4, 5]
    )
    .rename('suitability')
    .updateMask(source.mask());
}

// Direct method: remap existing classes; no thresholds.
function classifyDirect(image) {
  return remapSuitability(image);
}

// Rank method: remap existing classes using the same coding.
function classifyRank(image) {
  return remapSuitability(image);
}

// =============================================================================
// 4. MAP SETUP
// =============================================================================
var mapPanel = ui.Map();

mapPanel.setOptions('ROADMAP');
mapPanel.centerObject(studyArea, 10);

var rasterLayer = ui.Map.Layer(
  bestDirect.clip(studyArea.geometry()),
  {
    min: 1,
    max: 4,
    palette: bestPalette
  },
  'Best Livelihoods',
  true
);

var boundaryLayer = ui.Map.Layer(
  studyArea.style({
    color: '000000',
    fillColor: '00000000',
    width: 2
  }),
  {},
  'Region Boundary',
  false // Hidden by default initially
);

mapPanel.layers().reset([
  rasterLayer,
  boundaryLayer
]);


// =============================================================================
// 5. SIDEBAR AND HEADER
// =============================================================================

var sidebar = ui.Panel({
  style: {
    width: '350px',
    padding: '0',
    backgroundColor: '#ffffff'
  }
});

var header = ui.Panel({
  style: {
    padding: '18px 14px',
    backgroundColor: '#ffffff'
  }
});

header.add(ui.Label(
  'Climate-Informed Coastal Livelihood Decision Support System (CL-DSS)',
  {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#000000',
    whiteSpace: 'normal'
  }
));

header.add(ui.Label(
  'Spatially Explicit Alternative Livelihood Planning in the Indian Sundarbans',
  {
    fontSize: '12px',
    color: '#000000',
    whiteSpace: 'normal',
    margin: '6px 0 0 0'
  }
));

sidebar.add(header);

var controls = ui.Panel({
  style: {
    padding: '12px 10px',
    backgroundColor: '#ffffff'
  }
});

sidebar.add(controls);

function addHeading(text) {
  controls.add(ui.Label(text, {
    fontSize: '11px',
    color: '#667784',
    fontWeight: 'bold',
    margin: '12px 8px 8px 8px'
  }));
}


// =============================================================================
// 6. MCDA METHOD SELECTOR
// =============================================================================

addHeading('SELECT MCDA METHOD');

var methodSelect = ui.Select({
  items: [
    'Direct — Continuous Criterion Standardization (Normalization)',
    'Rank — Discrete Suitability Classification'
  ],
  value: 'Direct — Continuous Criterion Standardization (Normalization)',
  style: {
    stretch: 'horizontal'
  }
});

controls.add(methodSelect);


// =============================================================================
// 7. LIVELIHOOD LAYER SELECTOR
// =============================================================================

addHeading('SELECT LIVELIHOOD LAYER');

var layerSelect = ui.Select({
  items: [
    'Best Livelihoods',
    'Agriculture',
    'Aquaculture',
    'IFS',
    'Apiculture'
  ],
  value: 'Best Livelihoods',
  style: {
    stretch: 'horizontal'
  }
});

controls.add(layerSelect);


// =============================================================================
// 8. BLOCK AND VILLAGE FILTERS
// =============================================================================

addHeading('FILTER REGION');

var blockSelect = ui.Select({
  items: ['Loading Blocks...'],
  value: 'Loading Blocks...',
  style: {
    stretch: 'horizontal'
  }
});

var villageSelect = ui.Select({
  items: ['All Villages'],
  value: 'All Villages',
  style: {
    stretch: 'horizontal',
    margin: '8px 0 0 0'
  }
});

controls.add(blockSelect);
controls.add(villageSelect);

var resetButton = ui.Button({
  label: 'Reset Region',
  style: {
    stretch: 'horizontal',
    margin: '8px 0'
  }
});

controls.add(resetButton);


// =============================================================================
// 9. STATISTICS PANEL
// =============================================================================

controls.add(ui.Label('', {
  border: '1px solid #dddddd',
  margin: '14px 0'
}));

addHeading('STATISTICS');

var chartContainer = ui.Panel({
  style: {
    stretch: 'horizontal'
  }
});

controls.add(chartContainer);


// =============================================================================
// 10. DYNAMIC LEGEND
// =============================================================================

var legendPanel = ui.Panel({
  style: {
    padding: '12px 10px',
    backgroundColor: '#f7f7f7'
  }
});

sidebar.add(legendPanel);

function updateLegend() {
  legendPanel.clear();

  var bestMode =
    layerSelect.getValue() === 'Best Livelihoods';

  legendPanel.add(ui.Label(
    bestMode
      ? 'BEST LIVELIHOOD LEGEND'
      : 'FAO SUITABILITY LEGEND',
    {
      fontSize: '11px',
      color: '#667784',
      fontWeight: 'bold',
      margin: '4px 8px 8px 8px'
    }
  ));

  var items = [];

  if (bestMode) {
    for (var i = 0; i < bestNames.length; i++) {
      items.push([
        bestNames[i],
        bestPalette[i]
      ]);
    }
  } else {
    for (var j = 0; j < suitabilityNames.length; j++) {
      items.push([
        suitabilityNames[j],
        suitabilityPalette[j]
      ]);
    }
  }

  items.forEach(function(item) {
    var swatch = ui.Label('', {
      backgroundColor: item[1],
      padding: '8px',
      margin: '0 8px 5px 0'
    });

    var label = ui.Label(item[0], {
      fontSize: '12px',
      margin: '0 0 5px 0',
      whiteSpace: 'normal'
    });

    legendPanel.add(ui.Panel(
      [swatch, label],
      ui.Panel.Layout.Flow('horizontal'),
      {
        stretch: 'horizontal',
        backgroundColor: '#ffffff'
      }
    ));
  });
}


// =============================================================================
// 11. PROJECT FOOTER AND CREDITS
// =============================================================================

var footer = ui.Panel({
  style: {
    padding: '12px',
    backgroundColor: '#e8f6f3',
    border: '2px solid #1abc9c',
    margin: '10px 0 0 0'
  }
});

footer.add(ui.Label({
  value: 'Developed by: Santanu Ghosh & Prof. S.R. Samadder',
  style: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#2980b9',
    textDecoration: 'underline',
    backgroundColor: '#e8f6f3',
    textAlign: 'center',
    whiteSpace: 'normal'
  },
  targetUrl:
    'https://scholar.google.com/citations?user=SCh4JHAAAAAJ&hl=en'
}));

footer.add(ui.Label({
  value: 'Principal Investigator: Prof. S.R. Samadder',
  style: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#2980b9',
    textDecoration: 'underline',
    backgroundColor: '#e8f6f3',
    textAlign: 'center',
    whiteSpace: 'normal',
    margin: '4px 0'
  },
  targetUrl:
    'https://scholar.google.com/citations?hl=en&user=OUZKzWEAAAAJ'
}));

footer.add(ui.Label(
  'Dept. of Environmental Science & Engineering\nIIT (ISM) Dhanbad',
  {
    fontSize: '11px',
    backgroundColor: '#e8f6f3',
    textAlign: 'center',
    whiteSpace: 'pre'
  }
));

footer.add(ui.Label(
  'Funded by: Anusandhan National Research Foundation (ANRF), Govt. of India',
  {
    fontSize: '11px',
    fontWeight: 'bold',
    backgroundColor: '#e8f6f3',
    textAlign: 'center',
    whiteSpace: 'normal'
  }
));

footer.add(ui.Label(
  'Project File No: EEQ/2022/000110',
  {
    fontSize: '11px',
    backgroundColor: '#e8f6f3',
    textAlign: 'center'
  }
));

footer.add(ui.Label(
  'Project Title: Development of Dynamic Geospatial Framework and Land Suitability Database for Best Alternative Livelihood Options in the Indian Sundarban Region',
  {
    fontSize: '10px',
    color: '#666666',
    backgroundColor: '#e8f6f3',
    textAlign: 'center',
    whiteSpace: 'normal',
    margin: '6px 0 4px 0'
  }
));

sidebar.add(footer);


// =============================================================================
// 12. CURRENT REGION STATE
// =============================================================================

var currentFeatures = studyArea;
var currentGeometry = studyArea.geometry();

var updateCounter = 0;
var blockNames = [];


// =============================================================================
// 13. GET SELECTED RASTER
// =============================================================================

function isBestLayer() {
  return layerSelect.getValue() === 'Best Livelihoods';
}

function getSelectedImage() {
  var method =
    methodSelect.getValue().indexOf('Direct') === 0
      ? 'Direct'
      : 'Rank';

  var livelihood = layerSelect.getValue();

  if (livelihood === 'Best Livelihoods') {
    return method === 'Direct'
      ? bestDirect
      : bestRank;
  }

  var rawImage = lsi[method][livelihood];

  return method === 'Direct'
    ? classifyDirect(rawImage)
    : classifyRank(rawImage);
}


// =============================================================================
// 14. UPDATE MAP AND LEGEND
// =============================================================================

function updateMap() {
  var image = ee.Image(getSelectedImage());
  var bestMode = isBestLayer();

  var methodName =
    methodSelect.getValue().indexOf('Direct') === 0
      ? 'Direct Method'
      : 'Rank Method';

  rasterLayer.setEeObject(
    image.clip(currentGeometry)
  );

  rasterLayer.setName(
    methodName + ' — ' + layerSelect.getValue()
  );

  if (bestMode) {
    rasterLayer.setVisParams({
      min: 1,
      max: 4,
      palette: bestPalette
    });
  } else {
    rasterLayer.setVisParams({
      min: 1,
      max: 5,
      palette: suitabilityPalette
    });
  }

  var blockVal = blockSelect.getValue();
  var showBoundary = (blockVal && blockVal !== 'Loading Blocks...' && blockVal !== 'All Blocks');

  boundaryLayer.setEeObject(
    currentFeatures.style({
      color: '000000',
      fillColor: '00000000',
      width: 2
    })
  );
  boundaryLayer.setShown(showBoundary);

  updateLegend();
  updateChart();
}


// =============================================================================
// 15. AREA STATISTICS AND COLUMN CHART (Memory Optimized)
// =============================================================================

function updateChart() {
  chartContainer.clear();

  var token = ++updateCounter;
  var bestMode = isBestLayer();
  var image = ee.Image(getSelectedImage());

  chartContainer.add(ui.Label(
    'Calculating area statistics...',
    {
      fontSize: '11px',
      color: '#555555'
    }
  ));

  var processingGeometry = currentGeometry.simplify(10);

  // Pixel area converted from square metres to hectares.
  var areaImage = ee.Image.pixelArea()
    .divide(10000)
    .rename('area');

  var classImage = image
    .select([0])
    .rename('class');

  var input = areaImage.addBands(classImage);

  var stats = input.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'class'
    }),
    geometry: processingGeometry,
    scale: 30,
    maxPixels: 1e13,
    bestEffort: true,
    tileScale: 16
  });

  stats.evaluate(function(result) {
    if (token !== updateCounter) {
      return;
    }

    chartContainer.clear();

    if (!result || !result.groups) {
      chartContainer.add(ui.Label(
        'No valid raster data found for this region.',
        {
          fontSize: '11px',
          color: '#b00020'
        }
      ));
      return;
    }

    var areas = bestMode
      ? {1: 0, 2: 0, 3: 0, 4: 0}
      : {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};

    result.groups.forEach(function(group) {
      var code = Number(group.class);

      if (
        Object.prototype.hasOwnProperty.call(areas, code)
      ) {
        areas[code] = Number(group.sum) || 0;
      }
    });

    var data;
    var chartTitle;

    if (bestMode) {
      chartTitle = 'Best Livelihood Area Distribution (ha)';

      data = [
        ['Livelihood', 'Area (ha)', {role: 'style'}],
        ['Agriculture', areas[1], bestPalette[0]],
        ['Aquaculture', areas[2], bestPalette[1]],
        ['Integrated Farming', areas[3], bestPalette[2]],
        ['Apiculture', areas[4], bestPalette[3]]
      ];
    } else {
      chartTitle =
        layerSelect.getValue() + ' Suitability Area (ha)';

      data = [
        ['FAO Suitability Class', 'Area (ha)', {role: 'style'}],
        ['S1', areas[1], suitabilityPalette[0]],
        ['S2', areas[2], suitabilityPalette[1]],
        ['S3', areas[3], suitabilityPalette[2]],
        ['N1', areas[4], suitabilityPalette[3]],
        ['N2', areas[5], suitabilityPalette[4]]
      ];
    }

    var chart = ui.Chart(data)
      .setChartType('ColumnChart')
      .setOptions({
        title: chartTitle,
        legend: {
          position: 'none'
        },
        hAxis: {
          title: bestMode
            ? 'Livelihood'
            : 'FAO Suitability Class',
          textStyle: {
            fontSize: 10
          },
          slantedText: false
        },
        vAxis: {
          title: 'Area (ha)',
          minValue: 0,
          format: '#,###'
        },
        bar: {
          groupWidth: '65%'
        },
        chartArea: {
          width: '82%',
          height: '68%'
        },
        height: 250
      });

    chartContainer.add(chart);

    data.slice(1).forEach(function(row) {
      chartContainer.add(ui.Label(
        row[0] + ': ' +
        Number(row[1]).toLocaleString(
          'en-IN',
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        ) + ' ha',
        {
          fontSize: '11px',
          color: '#444444',
          margin: '2px 0'
        }
      ));
    });
  });
}


// =============================================================================
// 16. LOAD VILLAGES FOR A SELECTED BLOCK
// =============================================================================

function loadVillages(blockName) {
  var features = blockName === 'All Blocks'
    ? studyArea
    : studyArea.filter(
        ee.Filter.eq('CD_Block', blockName)
      );

  features.aggregate_array('NAME')
    .distinct()
    .sort()
    .evaluate(function(names) {
      if (!names) {
        villageSelect.items().reset(['All Villages']);
        villageSelect.setValue('All Villages', false);
        return;
      }

      var validNames = names.filter(function(name) {
        return name !== null && name !== '';
      });

      villageSelect.items().reset(
        ['All Villages'].concat(validNames)
      );

      villageSelect.setValue('All Villages', false);
    });
}


// =============================================================================
// 17. LOAD BLOCK OPTIONS
// =============================================================================

studyArea.aggregate_array('CD_Block')
  .distinct()
  .sort()
  .evaluate(function(names) {
    if (!names) {
      print(
        'Could not load blocks. Check the CD_Block field in the study-area asset.'
      );
      return;
    }

    blockNames = names.filter(function(name) {
      return name !== null && name !== '';
    });

    blockSelect.items().reset(
      ['All Blocks'].concat(blockNames)
    );

    blockSelect.setValue('All Blocks', false);

    loadVillages('All Blocks');
  });


// =============================================================================
// 18. BLOCK FILTER EVENT
// =============================================================================

blockSelect.onChange(function(blockName) {
  if (
    !blockName ||
    blockName === 'Loading Blocks...'
  ) {
    return;
  }

  villageSelect.items().reset(['All Villages']);
  villageSelect.setValue('All Villages', false);

  currentFeatures = blockName === 'All Blocks'
    ? studyArea
    : studyArea.filter(
        ee.Filter.eq('CD_Block', blockName)
      );

  currentGeometry = currentFeatures.geometry();

  loadVillages(blockName);

  mapPanel.centerObject(
    currentFeatures,
    blockName === 'All Blocks' ? 10 : 11
  );

  updateMap();
});


// =============================================================================
// 19. VILLAGE FILTER EVENT
// =============================================================================

villageSelect.onChange(function(villageName) {
  if (!villageName) {
    return;
  }

  var blockName = blockSelect.getValue();

  var blockFeatures = blockName === 'All Blocks'
    ? studyArea
    : studyArea.filter(
        ee.Filter.eq('CD_Block', blockName)
      );

  currentFeatures = villageName === 'All Villages'
    ? blockFeatures
    : blockFeatures.filter(
        ee.Filter.eq('NAME', villageName)
      );

  currentGeometry = currentFeatures.geometry();

  mapPanel.centerObject(
    currentFeatures,
    villageName === 'All Villages'
      ? (blockName === 'All Blocks' ? 10 : 11)
      : 13
  );

  updateMap();
});


// =============================================================================
// 20. RESET REGION
// =============================================================================

resetButton.onClick(function() {
  blockSelect.setValue('All Blocks', false);

  villageSelect.items().reset(['All Villages']);
  villageSelect.setValue('All Villages', false);

  currentFeatures = studyArea;
  currentGeometry = studyArea.geometry();

  loadVillages('All Blocks');

  mapPanel.centerObject(studyArea, 10);

  updateMap();
});


// =============================================================================
// 21. METHOD AND LIVELIHOOD SELECTOR EVENTS
// =============================================================================

methodSelect.onChange(function() {
  updateMap();
});

layerSelect.onChange(function() {
  updateMap();
});


// =============================================================================
// 22. INITIALIZE DASHBOARD
// =============================================================================

ui.root.clear();

ui.root.add(
  ui.SplitPanel({
    firstPanel: sidebar,
    secondPanel: mapPanel,
    orientation: 'horizontal',
    wipe: false,
    style: {
      stretch: 'both'
    }
  })
);

updateMap();

print(
  'CL-DSS initialized successfully. Study area:',
  studyArea
);