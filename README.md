# Cloud-Based WebGIS-MCDA for Coastal Livelihood Suitability Assessment
This repository provides the Google Earth Engine JavaScript scripts associated with the study of alternative coastal livelihood suitability in the Indian Sundarbans. The research compares continuous and discrete criterion standardization approaches within a cloud-based WebGIS-MCDA framework.

Four alternative livelihood options are considered:

Agriculture

Aquaculture

Apiculture

Integrated Farming Systems (IFS)

The framework integrates criterion standardization, FAHP-derived criterion weights and Weighted Linear Combination (WLC) to assess livelihood suitability.

Repository Contents

File

Description

Livelihood_Suitability_Analysis.js

Analytical workflow for data preparation, criterion standardization, weighted suitability assessment, LSI calculation and best-livelihood allocation.

COASTAL LIVELIHOOD DECISION SUPPORT SYSTEM _CL-DSS.js

Interactive Google Earth Engine application for visualizing suitability results and exploring spatial statistics.

Methodological Framework

The analytical workflow includes:

Preparation of spatial datasets and environmental criteria.

Continuous fuzzy criterion standardization.

Discrete rank-based criterion standardization.

Application of FAHP-derived criterion weights.

Weighted Linear Combination (WLC) for livelihood suitability assessment.

Calculation of the Livelihood Suitability Index (LSI).

Identification of the best-suited livelihood option.

Comparison of suitability outputs generated using the two standardization approaches.

Interactive WebGIS Application

The Cloud-Based Livelihood Decision Support System (CL-DSS) provides an interactive interface for exploring the livelihood suitability outputs.

Application link:
https://ee-santanughosh974.projects.earthengine.app/view/coastal-livelihood-decision-support-system-cl-dss

Software and Platform

Google Earth Engine

Google Earth Engine JavaScript API

Web-based geospatial analysis and visualization

Data and Access Requirements

The analytical scripts use Google Earth Engine datasets and project-specific assets. Some project-specific assets may require appropriate access permissions. Users should review the asset references and data requirements in the scripts before execution.

Reproducibility

The scripts are shared to support transparency and reproducibility of the computational workflow. The analytical results may depend on the availability of the referenced datasets, project assets, and the specified processing parameters.

Citation

If you use these scripts or adapt the framework, please cite the associated research article once its publication details become available.

License

This repository is distributed under the MIT License. Please consult the LICENSE file for details.
