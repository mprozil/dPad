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
        
        let categorical = dataViews[0].categorical;
        let horizontalCategory = categorical.categories[0];
        let verticalCategory = categorical.categories[1];

        let horizontalDataPoints: CategoryDataPoint[] = [];
        let verticalDataPoints: CategoryDataPoint[] = [];
        
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
        // TODO one cycle
        for (let i = 0, len = Math.max(horizontalCategory.values.length); i < len; i++) {
            horizontalDataPoints.push({
                category: horizontalCategory.values[i] + '',
                selectionId: host.createSelectionIdBuilder()
                    .withCategory(horizontalCategory, i)
                    .createSelectionId()
            });
        }
      
        for (let i = 0, len = Math.max(verticalCategory.values.length); i < len; i++) {
            verticalDataPoints.push({
                category: verticalCategory.values[i] + '',
                selectionId: host.createSelectionIdBuilder()
                    .withCategory(verticalCategory, i)
                    .createSelectionId()
            });
        }

        return {
            horizontalDataPoints: horizontalDataPoints,
            verticalDataPoints: verticalDataPoints,
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
            let incremental = this.viewModel.settings.settings.incremental;
            let incrementalStep = incremental*step;
            //gives an array with unique verticalDataPoints
            var uniqueVerticalCount = [];
            for (let i = 0; i < this.viewModel.verticalDataPoints.length; i++) {
                if (uniqueVerticalCount.indexOf(this.viewModel.verticalDataPoints[i].category) == -1 ) {
                    uniqueVerticalCount.push(this.viewModel.verticalDataPoints[i].category);
                }
            }

            //Check if selection is within limits
            if(direction == "v")
            {
                let currentGroup = Math.floor(this.lastSelected / uniqueVerticalCount.length);
                let minGroup = currentGroup * uniqueVerticalCount.length;
                let maxGroup = (currentGroup + 1) * uniqueVerticalCount.length - 1;
                if ((this.lastSelected + incrementalStep) < minGroup || (this.lastSelected + incrementalStep) > maxGroup) return;
                this.lastSelected = this.lastSelected + incrementalStep;
                this.selectionManager.select(this.viewModel.verticalDataPoints[this.lastSelected].selectionId);
            }
            else if(direction == "h")
            {
                if ((this.lastSelected + incrementalStep*uniqueVerticalCount.length) < 0 || (this.lastSelected + incrementalStep*uniqueVerticalCount.length) > (this.viewModel.horizontalDataPoints.length-1)) return;
                this.lastSelected = this.lastSelected + incrementalStep*uniqueVerticalCount.length;
                this.selectionManager.select(this.viewModel.horizontalDataPoints[this.lastSelected].selectionId);
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