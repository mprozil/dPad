/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    "use strict";

     /**
     * Interface for data points.
     *
     * @interface
     * @property {string} category          - Corresponding category of data value.
     * @property {ISelectionId} selectionId - Id assigned to data point for cross filtering
     *                                        and visual interaction.
     */
    interface CategoryDataPoint {
        category: string;
        selectionId: ISelectionId;
    };

    /**
     * Interface for viewmodel.
     *
     * @interface
     * @property {CategoryDataPoint[]} dataPoints - Set of data points the visual will render.
     */
    interface ViewModel {
        horizontalDataPoints: CategoryDataPoint[];
        verticalDataPoints: CategoryDataPoint[];
        numberOfAxis: number;
        sortedBy: String;
        settings: VisualSettings;
    };

    /**
     * Interface for VisualChart settings.
     *
     * @interface
     * @property {{horizontal:boolean}} settings - Object property to enable or disable horizontal arrows.
     * @property {{vertical:boolean}} settings - Object property to enable or disable vertical arrows.
     * @property {{diagonal:boolean}} settings - Object property to enable or disable diagonal arrows.
     * @property {{incremental:number}} settings - Object property that allows setting the incremental number.
     */
    interface VisualSettings {        
        settings: {
            horizontal: boolean;
            vertical: boolean;
            diagonal: boolean;
            incremental: number;
        };
    }
    /**
     * Function that converts queried data into a view model that will be used by the visual.
     *
     * @function
     * @param {VisualUpdateOptions} options - Contains references to the size of the container
     *                                        and the dataView which contains all the data
     *                                        the visual had queried.
     * @param {IVisualHost} host            - Contains references to the host which contains services
     */
    function visualTransform(options: VisualUpdateOptions, host: IVisualHost): ViewModel {
        let dataViews = options.dataViews;
        
        let horizontalIdxInCategories = -1;
        let verticalIdxInCategories = -1;
        let horizontalDisplayName = "";
        let verticalDisplayName = "";
        let sortedBy = "";

        //TODO: Refactoring    
        for (let i = 0; i < options.dataViews[0].metadata.columns.length; i++) {
            if (options.dataViews[0].metadata.columns[i].roles.hasOwnProperty('horizontalCategory')) {
                horizontalDisplayName = options.dataViews[0].metadata.columns[i].displayName;
                if(i == 0) sortedBy = "horizontal";
            }
            else if (options.dataViews[0].metadata.columns[i].roles.hasOwnProperty('verticalCategory')) {
                verticalDisplayName = options.dataViews[0].metadata.columns[i].displayName;
                if(i == 0) sortedBy = "vertical";
            }                
        }

        for (let i = 0; i < dataViews[0].categorical.categories.length; i++)
        {
            if (dataViews[0].categorical.categories[i].source.displayName == horizontalDisplayName)
                horizontalIdxInCategories = i;
            else if (dataViews[0].categorical.categories[i].source.displayName == verticalDisplayName)
                verticalIdxInCategories = i;
        }

        let horizontalValues: PrimitiveValue[] = [];
        let verticalValues: PrimitiveValue[] = [];
        let horizontalCategory: DataViewCategoryColumn;
        let verticalCategory: DataViewCategoryColumn;
        let numberOfAxis = 0;

        if (horizontalIdxInCategories > -1) {
            horizontalCategory = dataViews[0].categorical.categories[horizontalIdxInCategories];
            horizontalValues = horizontalCategory.values;
            numberOfAxis++;
        }
        
        if (verticalIdxInCategories > -1) {
            verticalCategory = dataViews[0].categorical.categories[verticalIdxInCategories];
            verticalValues = verticalCategory.values;
            numberOfAxis++;
        }
        
        let colorPalette: IColorPalette = host.colorPalette;
        let objects = dataViews[0].metadata.objects;

        let visualSettings: VisualSettings = {
            settings: {
                horizontal: getValue<boolean>(objects, 'settings', 'horizontal', true),
                vertical: getValue<boolean>(objects, 'settings', 'vertical', true),
                diagonal: getValue<boolean>(objects, 'settings', 'diagonal', false),
                incremental: getValue<number>(objects, 'settings', 'incremental', 1)
            }
        }
        
        let dataPoints: CategoryDataPoint[] = [];
        let horizontalDataPoints: CategoryDataPoint[] = [];
        let verticalDataPoints: CategoryDataPoint[] = [];
        

        // Set of data points. Can have data for 1 or 2 axis (in this case the 
        // keys will be the axis on category 0)
        /*
        let valuesToBeTransformed = dataViews[0].categorical.categories[0].values;
        for (let i = 0, len = Math.max(valuesToBeTransformed.length); i < len; i++) {
            dataPoints.push({
                category: valuesToBeTransformed[i] + '',
                selectionId: host.createSelectionIdBuilder()
                    .withCategory(horizontalCategory, i)
                    .createSelectionId()
            });
        }*/

       if (horizontalIdxInCategories > -1)
       {
            for (let i = 0, len = Math.max(horizontalCategory.values.length); i < len; i++) {
                horizontalDataPoints.push({
                    category: horizontalCategory.values[i] + '',
                    selectionId: host.createSelectionIdBuilder()
                        .withCategory(horizontalCategory, i)
                        .createSelectionId()
                });
            }
       }

       if (verticalIdxInCategories > -1)
       {
           for (let i = 0, len = Math.max(verticalCategory.values.length); i < len; i++) {
                verticalDataPoints.push({
                    category: verticalCategory.values[i] + '',
                    selectionId: host.createSelectionIdBuilder()
                        .withCategory(verticalCategory, i)
                        .createSelectionId()
                });
            }
       }

        return {
            horizontalDataPoints: horizontalDataPoints,
            verticalDataPoints: verticalDataPoints,
            numberOfAxis: numberOfAxis,
            sortedBy: sortedBy,
            settings: visualSettings
        };
    }


    export class Visual implements IVisual {
        private visualSettings: VisualSettings;
        private host: IVisualHost;
        private svg: d3.Selection<SVGElement>;
        private controlsSVG: d3.Selection<SVGElement>;
        private selectionManager: ISelectionManager;
        private viewModel: ViewModel;
        private lastSelected: number;
        
        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();
            this.lastSelected = 0;
            
            this.svg = d3.select(options.element).append("svg")
                 .attr("width","100%")
                 .attr("height","100%");
          
            this.controlsSVG = this.svg.append('svg');
            
            // TODO create button class
            let buttonNames = ["up", "down", "left","right","diagNW","diagNE","diagSE","diagSW"];
            let buttonPath = [
                    "M 25,5 45,50 5,50 z", 
                    "M 25,50 45,5 5,5 Z",
                    "M 5,25 50,5 50,45 Z", 
                    "M 50,25 5,45 5,5 z",
                    "M 20,20 50,20 20,50 Z",
                    "M 20,20 50,20 50,50 Z",
                    "M 50,50 50,20 20,50 Z",
                    "M 20,20 20,50 50,50 Z"
                    ];
            let buttonPosition = ["50, 0",
                                  "50,95",
                                  "0, 50",
                                  "95,50",
                                  "5,5",
                                  "75,5",
                                  "75,75",
                                  "5,75"];

            for (let i = 0; i < buttonNames.length; ++i) {
                let container = this.controlsSVG.append('g')
                 .attr('class', "controls")
                 .attr('transform','translate(' + buttonPosition[i] + ')')
                 .attr('id', buttonNames[i]); 
                container.append("path")
                .attr("d", buttonPath[i]);
             }
        
            //Events on click
            this.svg.select("#up").on("click", () => {
                this.step("v",1);
            });
            this.svg.select("#down").on("click", () => {
                this.step("v",-1);
            });
            this.svg.select("#left").on("click", () => {
                this.step("h",-1);
            });     
            this.svg.select("#right").on("click", () => {
                this.step("h",1);
            }); 
             this.svg.select("#diagNE").on("click", () => {
                this.step("v",1);
                this.step("h",1);
            });
            this.svg.select("#diagNW").on("click", () => {
                this.step("v",1);
                this.step("h",-1);
            });
            this.svg.select("#diagSW").on("click", () => {
                this.step("v",-1);
                this.step("h",-1);
            });     
            this.svg.select("#diagSE").on("click", () => {
                this.step("v",-1);
                this.step("h",1);
            }); 
        }

        public update(options: VisualUpdateOptions) {
            
            let viewModel = this.viewModel = visualTransform(options, this.host);
            this.visualSettings = viewModel.settings;

            this.controlsSVG
                .attr("viewBox","0 0 150 150")
                .attr('preserveAspectRatio','xMinYMid'); 
            
            let showHorizontal = this.visualSettings.settings.horizontal;
            let showVertical = this.visualSettings.settings.vertical;

            // Disable diagonal arrows if horizontal or vertical are disabled
            let showDiagonal = this.visualSettings.settings.diagonal 
                                && this.visualSettings.settings.horizontal
                                && this.visualSettings.settings.vertical;

            this.visualSettings.settings.diagonal = showDiagonal;                    

            this.svg.selectAll("#right, #left").attr("visibility", showHorizontal ? "show" : "hidden");         
            this.svg.select("#up").attr("transform", showHorizontal ? 'translate(50, 0)' : 'translate(50, 15)');
            this.svg.select("#down").attr("transform", showHorizontal ? 'translate(50, 95)' : 'translate(50, 80)');
            
            this.svg.selectAll("#up, #down").attr("visibility", showVertical ? "show" : "hidden");   
            this.svg.select("#left").attr("transform", showVertical ? 'translate(0, 50)' : 'translate(15, 50)');
            this.svg.select("#right").attr("transform", showVertical ? 'translate(95, 50)' : 'translate(80, 50)');
            
            this.svg.selectAll("#diagNE, #diagNW,#diagSE, #diagSW").attr("visibility", showDiagonal ? "show" : "hidden");
    }

        public step(direction: string, step: number) {
            let incremental = this.visualSettings.settings.incremental;
            let incrementalStep = incremental*step;

            //gives an array with unique verticalDataPoints
            let uniqueVerticalCount = [];
            for (let i = 0; i < this.viewModel.verticalDataPoints.length; i++) {
                if (uniqueVerticalCount.indexOf(this.viewModel.verticalDataPoints[i].category) == -1 ) {
                    uniqueVerticalCount.push(this.viewModel.verticalDataPoints[i].category);
                }
            }

            //gives an array with unique horizontalDataPoints
            let uniqueHorizontalCount = [];
            for (let i = 0; i < this.viewModel.horizontalDataPoints.length; i++) {
                if (uniqueHorizontalCount.indexOf(this.viewModel.horizontalDataPoints[i].category) == -1 ) {
                    uniqueHorizontalCount.push(this.viewModel.horizontalDataPoints[i].category);
                }
            }


            let dataPointsToUse = this.viewModel.sortedBy == "horizontal" ? this.viewModel.horizontalDataPoints 
                                                                          : this.viewModel.verticalDataPoints;

             //TODO: Refactoring 
            if(direction == "v" && this.viewModel.sortedBy == "horizontal")
            {
                let numberOfPoints = this.viewModel.verticalDataPoints.length;
                if (numberOfPoints == 0 ) return;
                let currentGroup = Math.floor(this.lastSelected / uniqueVerticalCount.length);
                let minGroup = currentGroup * uniqueVerticalCount.length;
                let maxGroup = (currentGroup + 1) * uniqueVerticalCount.length - 1;
                if ((this.lastSelected + incrementalStep) < minGroup || (this.lastSelected + incrementalStep) > maxGroup) return;
                this.lastSelected = this.lastSelected + incrementalStep;
                this.selectionManager.select(dataPointsToUse[this.lastSelected].selectionId);
            }
            else if(direction == "h" && this.viewModel.sortedBy == "horizontal")
            {
                let numberOfPoints = this.viewModel.horizontalDataPoints.length;
                if (numberOfPoints == 0 ) return;
                if (this.viewModel.verticalDataPoints.length == 0) {
                    if ((this.lastSelected + incrementalStep) < 0 || (this.lastSelected + incrementalStep) > (numberOfPoints-1)) return;
                    this.lastSelected = this.lastSelected + incrementalStep;    
                } else {
                    if ((this.lastSelected + incrementalStep*uniqueVerticalCount.length) < 0 || (this.lastSelected + incrementalStep*uniqueVerticalCount.length) > (numberOfPoints-1)) return;
                    this.lastSelected = this.lastSelected + incrementalStep*uniqueVerticalCount.length;
                }
                this.selectionManager.select(dataPointsToUse[this.lastSelected].selectionId);
            }
            else if(direction == "v" && this.viewModel.sortedBy == "vertical")
            {
                let numberOfPoints = this.viewModel.verticalDataPoints.length;
                if (numberOfPoints == 0 ) return;
                if (this.viewModel.horizontalDataPoints.length == 0) {
                    if ((this.lastSelected + incrementalStep) < 0 || (this.lastSelected + incrementalStep) > (numberOfPoints-1)) return;
                    this.lastSelected = this.lastSelected + incrementalStep;    
                } else {
                    if ((this.lastSelected + incrementalStep*uniqueHorizontalCount.length) < 0 || (this.lastSelected + incrementalStep*uniqueHorizontalCount.length) > (numberOfPoints-1)) return;
                    this.lastSelected = this.lastSelected + incrementalStep*uniqueHorizontalCount.length;
                }
                this.selectionManager.select(dataPointsToUse[this.lastSelected].selectionId);
            }
            else if(direction == "h" && this.viewModel.sortedBy == "vertical")
            {
                let numberOfPoints = this.viewModel.horizontalDataPoints.length;
                if (numberOfPoints == 0 ) return;
                let currentGroup = Math.floor(this.lastSelected / uniqueHorizontalCount.length);
                let minGroup = currentGroup * uniqueHorizontalCount.length;
                let maxGroup = (currentGroup + 1) * uniqueHorizontalCount.length - 1;
                if ((this.lastSelected + incrementalStep) < minGroup || (this.lastSelected + incrementalStep) > maxGroup) return;
                this.lastSelected = this.lastSelected + incrementalStep;
                this.selectionManager.select(dataPointsToUse[this.lastSelected].selectionId);
            }
        }

        /** 
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the 
         * objects and properties you want to expose to the users in the property pane.
         * 
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
           let objectName = options.objectName;
            let objectEnumeration: VisualObjectInstance[] = [];

            switch(objectName) {            
                case 'settings': 
                    objectEnumeration.push({
                        objectName: objectName,
                        properties: {
                            horizontal: this.visualSettings.settings.horizontal,
                            vertical: this.visualSettings.settings.vertical,
                            diagonal: this.visualSettings.settings.diagonal,
                            incremental: this.visualSettings.settings.incremental
                        },
                        validValues: {
                            incremental: {
                                numberRange: {
                                    min: 1,
                                    max: 100
                                }
                            }
                        },
                        selector: null
                    });
                break;
            };
            return objectEnumeration;
         }
    }
}