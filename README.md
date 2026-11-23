# Cloud-Based WebGIS-MCDA for Coastal Livelihood Suitability Assessment
**Overview**

This repository contains the Google Earth Engine (GEE) JavaScript scripts developed to assess the suitability of alternative coastal livelihoods in the Indian Sundarbans. The research compares continuous fuzzy and discrete rank-based criterion standardization approaches within a cloud-based WebGIS-based Multi-Criteria Decision Analysis (WebGIS-MCDA) framework.

Four alternative coastal livelihood options are considered:

Agriculture
Aquaculture
Apiculture
Integrated Farming Systems (IFS)

The framework integrates criterion standardization, FAHP-derived criterion weights and Weighted Linear Combination (WLC) to evaluate livelihood suitability and identify the most suitable livelihood alternative at each location.

**Authors and Affiliations**

Santanu Ghosh, Rupesh Rajwar, Sagiraju Shashank Dutt, and Sukha Ranjan Samadder*

Department of Environmental Science and Engineering, Indian Institute of Technology (Indian School of Mines), Dhanbad, Jharkhand 826004, India.


Author ORCID Profiles:

Santanu Ghosh: (https://orcid.org/0000-0001-8713-9774)

Rupesh Rajwar: (https://orcid.org/0009-0001-3727-3497)

Sagiraju Shashank Dutt: (https://orcid.org/ 0009-0004-1499-6678)

Corresponding Author:
Prof. Sukha Ranjan Samadder
Email: samadder@iitism.ac.in
ORCID: (https://orcid.org/0000-0002-0037-7030)

**Repository Contents**

Livelihood_Suitability_Analysis.js

Main analytical script for spatial data preparation, continuous and discrete criterion standardization, FAHP-weighted suitability assessment, Livelihood Suitability Index (LSI) calculation and best-livelihood allocation.

COASTAL LIVELIHOOD DECISION SUPPORT SYSTEM _CL-DSS.js

Interactive Google Earth Engine dashboard for visualizing precomputed suitability outputs, selecting livelihood alternatives and standardization methods, filtering administrative areas and exploring area statistics.

Methodological Framework

The analytical workflow consists of the following stages:
Spatial dataset preparation and preprocessing.
Selection and preparation of environmental and socioeconomic criteria.
Continuous fuzzy criterion standardization.
Discrete rank-based criterion standardization.
Application of FAHP-derived criterion weights.
Weighted Linear Combination (WLC) for suitability assessment.
Calculation of the Livelihood Suitability Index (LSI).
Identification of the best-suited livelihood alternative.
Comparison of suitability outputs obtained using the two criterion standardization approaches.

**Interactive WebGIS Application**

The Cloud-Based Livelihood Decision Support System (CL-DSS) provides an interactive interface for exploring the spatial suitability outputs.

**Access the application**:
(https://ee-santanughosh974.projects.earthengine.app/view/coastal-livelihood-decision-support-system-cl-dss)

The dashboard supports the visualization of suitability maps generated using the continuous and discrete standardization approaches, selection of livelihood alternatives, administrative-area filtering and exploration of area-based suitability statistics.

**Software and Platform**

The computational workflow and interactive application are implemented using:
Google Earth Engine.
Google Earth Engine JavaScript API.
Cloud-based geospatial processing and visualization.

**Data Sources and Access Requirements**

The analytical script uses publicly available Google Earth Engine datasets and project-specific spatial assets. Some project-specific assets referenced in the scripts may require appropriate Google Earth Engine access permissions.


**Citation**

If you use or adapt the scripts, please cite the associated research article when its publication details become available.
Research article: To be updated following publication.

**License**

The code in this repository is distributed under the MIT License. Please refer to the LICENSE file for the applicable terms. The licence does not automatically apply to external datasets or third-party resources referenced in the scripts.
