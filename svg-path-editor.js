const PathEditor = {
    /**
     * Parses the 'd' attribute of an SVG path into a structured array of objects.
     * @param {string} d - The 'd' attribute string.
     * @returns {Array<Object>} An array of objects representing path commands and coordinates.
     */
    parsePath: function(d) {
        const regex = /([MmLlCcAaZz])\s*([^A-Za-z]+)?/g;
        let match;
        const pathData = [];
        while ((match = regex.exec(d)) !== null) {
            const command = match[1];
            const commandObj = { command: command };
            if (command === 'Z' || command === 'z') {
                pathData.push(commandObj);
                continue;
            }
            const coords = (match[2] || '').trim().split(/[\s,]+/).map(Number);
            if (command === 'M' || command === 'm' || command === 'L' || command === 'l') {
                commandObj.x = coords[0];
                commandObj.y = coords[1];
            } else if (command === 'C' || command === 'c') {
                commandObj.x1 = coords[0];
                commandObj.y1 = coords[1];
                commandObj.x2 = coords[2];
                commandObj.y2 = coords[3];
                commandObj.x = coords[4];
                commandObj.y = coords[5];
            } else if (command === 'A' || command === 'a') {
                commandObj.rx = coords[0];
                commandObj.ry = coords[1];
                commandObj.xAxisRotation = coords[2];
                commandObj.largeArcFlag = coords[3];
                commandObj.sweepFlag = coords[4];
                commandObj.x = coords[5];
                commandObj.y = coords[6];
            }
            pathData.push(commandObj);
        }
        return pathData;
    },

    /**
     * Regenerates the 'd' attribute string from a structured path data array.
     * @param {Array<Object>} pathData - The structured array of path command objects.
     * @param {string} pathId - The ID of the SVG path element.
     * @returns {string} The new 'd' attribute string.
     */
    generatePath: function(pathData, pathId) {
        let dString = '';
        pathData.forEach(commandObj => {
            dString += commandObj.command + ' ';
            if (commandObj.command === 'M' || commandObj.command === 'm' || commandObj.command === 'L' || commandObj.command === 'l') {
                dString += `${commandObj.x},${commandObj.y} `;
            } else if (commandObj.command === 'C' || commandObj.command === 'c') {
                dString += `${commandObj.x1},${commandObj.y1} ${commandObj.x2},${commandObj.y2} ${commandObj.x},${commandObj.y} `;
            } else if (commandObj.command === 'A' || commandObj.command === 'a') {
                dString += `${commandObj.rx},${commandObj.ry} ${commandObj.xAxisRotation} ${commandObj.largeArcFlag},${commandObj.sweepFlag} ${commandObj.x},${commandObj.y} `;
            }
        });
        const originalPathD = document.getElementById(pathId).getAttribute('d');
        if (originalPathD && originalPathD.trim().endsWith('Z')) {
            dString += 'Z';
        }
        return dString.trim();
    },

    /**
     * Initializes a draggable SVG path editor for a specific path element.
     * @param {SVGPathElement} pathElem - The SVG path element to make editable.
     * @param {SVGElement} markersGroup - The SVG group element to draw markers on.
     */
    init: function(pathElem, markersGroup) {
        this.pathElem = pathElem;
        this.svg = pathElem.closest('svg');
        this.markersGroup = markersGroup;

        let activeMarker = null;
        let isDragging = false;

        const handleStart = (e) => {
            const target = e.target.closest('.draggable-marker');
            if (target) {
                isDragging = true;
                activeMarker = target;
                e.preventDefault();
            }
        };

        const handleMove = (e) => {
            if (!isDragging || !activeMarker) return;
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            const svgPoint = this.svg.createSVGPoint();
            svgPoint.x = clientX;
            svgPoint.y = clientY;
            const convertedPoint = svgPoint.matrixTransform(this.svg.getScreenCTM().inverse());
            
            const updateData = {
                x: convertedPoint.x,
                y: convertedPoint.y,
                index: parseInt(activeMarker.getAttribute('data-index')),
                pointType: activeMarker.getAttribute('data-point-type') || 'endpoint'
            };
            
            this.updatePath(updateData);
        };

        const handleEnd = () => {
            isDragging = false;
            activeMarker = null;
        };

        this.markersGroup.addEventListener('mousedown', handleStart);
        this.markersGroup.addEventListener('touchstart', handleStart, { passive: false });
        
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('touchmove', handleMove, { passive: false });
        
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchend', handleEnd);

        this.drawMarkers(this.parsePath(this.pathElem.getAttribute('d')));
    },

    /**
     * Returns the current parsed path data from the SVG element.
     * @returns {Array<Object>} The parsed path data.
     */
    getPathData: function() {
        return this.parsePath(this.pathElem.getAttribute('d'));
    },

    /**
     * Applies a new set of parsed path data to the SVG element.
     * @param {Array<Object>} newPathData - The new path data to apply.
     */
    applyPathData: function(newPathData) {
        this.pathElem.setAttribute('d', this.generatePath(newPathData, this.pathElem.id));
        this.drawMarkers(newPathData);
    },

    /**
     * Updates the SVG path and redraws the markers after a drag event.
     * @param {Object} updateData - An object containing the new coordinates and point type.
     */
    updatePath: function(updateData) {
        const parsedPathData = this.parsePath(this.pathElem.getAttribute('d'));
        const commandObj = parsedPathData[updateData.index];
        
        if (updateData.pointType === 'C1') {
            commandObj.x1 = updateData.x;
            commandObj.y1 = updateData.y;
        } else if (updateData.pointType === 'C2') {
            commandObj.x2 = updateData.x;
            commandObj.y2 = updateData.y;
        } else {
            commandObj.x = updateData.x;
            commandObj.y = updateData.y;
        }

        this.pathElem.setAttribute('d', this.generatePath(parsedPathData, this.pathElem.id));
        this.drawMarkers(parsedPathData);
    },

    /**
     * Draws the draggable markers on the SVG for a specific path.
     * @param {Array<Object>} parsedPathData - The structured data for the path.
     */
    drawMarkers: function(parsedPathData) {
        this.markersGroup.innerHTML = '';
        let index = 0;
        parsedPathData.forEach(commandObj => {
            if (commandObj.x !== undefined && commandObj.y !== undefined) {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', commandObj.x);
                circle.setAttribute('cy', commandObj.y);
                circle.setAttribute('r', 5);
                circle.setAttribute('fill', '#f44336');
                circle.setAttribute('stroke', '#fff');
                circle.setAttribute('stroke-width', 1.5);
                circle.setAttribute('class', 'draggable-marker');
                circle.setAttribute('data-index', index);
                this.markersGroup.appendChild(circle);
            }
            if (commandObj.x1 !== undefined && commandObj.y1 !== undefined) {
                const circle1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle1.setAttribute('cx', commandObj.x1);
                circle1.setAttribute('cy', commandObj.y1);
                circle1.setAttribute('r', 5);
                circle1.setAttribute('fill', '#4caf50');
                circle1.setAttribute('stroke', '#fff');
                circle1.setAttribute('stroke-width', 1.5);
                circle1.setAttribute('class', 'draggable-marker');
                circle1.setAttribute('data-index', index);
                circle1.setAttribute('data-point-type', 'C1');
                this.markersGroup.appendChild(circle1);
            }
            if (commandObj.x2 !== undefined && commandObj.y2 !== undefined) {
                const circle2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle2.setAttribute('cx', commandObj.x2);
                circle2.setAttribute('cy', commandObj.y2);
                circle2.setAttribute('r', 5);
                circle2.setAttribute('fill', '#4caf50');
                circle2.setAttribute('stroke', '#fff');
                circle2.setAttribute('stroke-width', 1.5);
                circle2.setAttribute('class', 'draggable-marker');
                circle2.setAttribute('data-index', index);
                circle2.setAttribute('data-point-type', 'C2');
                this.markersGroup.appendChild(circle2);
            }
            index++;
        });
    },
    
    createPathEditors: function(pathIds) {
        const pathEditors = {};
        pathIds.forEach(id => {
            const path = document.getElementById(id);
            if (path) {
                const svg = path.closest('svg');
                const markersGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                markersGroup.id = `${id}-markers`;
                svg.appendChild(markersGroup);
                const editorInstance = Object.assign({}, this);
                editorInstance.init(path, markersGroup);
                pathEditors[id] = editorInstance;
            }
        });
        return pathEditors;
    }
    
};
