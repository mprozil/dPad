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
    };

    
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
            verticalDataPoints: verticalDataPoints
        };
    }


    export class Visual implements IVisual {
        private settings: VisualSettings;
        private host: IVisualHost;
        private svg: d3.Selection<SVGElement>;
        private controlsSVG: d3.Selection<SVGElement>;
        private selectionManager: ISelectionManager;
        private viewModel: ViewModel;
        private lastSelected: number;

        constructor(options: VisualConstructorOptions) {
            console.log('Visual constructor', options);
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();
            this.lastSelected = 1;
            
            this.svg = d3.select(options.element).append("svg")
                 .attr("width","100%")
                 .attr("height","100%");
          
            this.controlsSVG = this.svg.append('svg');
            
            // TODO create button class
            let buttonNames = ["up", "down", "left","right"];
            let buttonPath = [
                    "M 25,5 45,50 5,50 z", 
                    "M 25,50 45,5 5,5 Z",
                    "M 5,25 50,5 50,45 Z", 
                    "M 50,25 5,45 5,5 z"
                    ];
            let buttonPosition = ["50, 0",
                                  "50,95",
                                  "0, 50",
                                  "95,50"];

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
        }

        public update(options: VisualUpdateOptions) {
            
            let viewModel = this.viewModel = visualTransform(options, this.host);
            this.settings = Visual.parseSettings(options && options.dataViews && options.dataViews[0]);
            console.log('Visual update', options);
            console.log('Selection Manager', this.selectionManager);

            this.controlsSVG
                .attr("viewBox","0 0 150 150")
                .attr('preserveAspectRatio','xMinYMid'); 
        }

        public step(direction: string, step: number) {
            console.log(direction);
            console.log(step);
            console.log('Vertical', this.viewModel.verticalDataPoints);
            console.log('Horizontal', this.viewModel.horizontalDataPoints);

            //gives an array with unique verticalDataPoints
            var uniqueSetCount = [];
            for (let i = 0; i < this.viewModel.verticalDataPoints.length; i++) {
                if (uniqueSetCount.indexOf(this.viewModel.verticalDataPoints[i].category) == -1 ) {
                    uniqueSetCount.push(this.viewModel.verticalDataPoints[i].category);
                }
            }
            console.log(uniqueSetCount.length)

            //Check if selection is within limits
            if(direction == "v")
            {
                if ((this.lastSelected + step) < 0 || (this.lastSelected + step) > (this.viewModel.verticalDataPoints.length-1)) return;
                this.lastSelected = this.lastSelected + step;
                this.selectionManager.select(this.viewModel.verticalDataPoints[this.lastSelected].selectionId);
            }

            if(direction == "h")
            {
                if ((this.lastSelected + step*uniqueSetCount.length) < 0 || (this.lastSelected + step*uniqueSetCount.length) > (this.viewModel.horizontalDataPoints.length-1)) return;
                this.lastSelected = this.lastSelected + step*uniqueSetCount.length;
                this.selectionManager.select(this.viewModel.horizontalDataPoints[this.lastSelected].selectionId);
            }
        }

        private static parseSettings(dataView: DataView): VisualSettings {
            return VisualSettings.parse(dataView) as VisualSettings;
        }

        /** 
         * This function gets called for each of the objects defined in the capabilities files and allows you to select which of the 
         * objects and properties you want to expose to the users in the property pane.
         * 
         */
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstance[] | VisualObjectInstanceEnumerationObject {
            return VisualSettings.enumerateObjectInstances(this.settings || VisualSettings.getDefault(), options);
        }
    }
}