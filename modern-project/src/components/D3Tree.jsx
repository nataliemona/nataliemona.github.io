import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import familyData from '../family.json';
import './D3Tree.css';

const D3Tree = () => {
  const ref = useRef();
  const [data] = useState(familyData);

  useEffect(() => {
    if (data) {
      ref.current.innerHTML = '';

      const width = ref.current.clientWidth;
      const height = ref.current.clientHeight;
      const diameter = Math.min(width, height);

      let maxYear = 0;
      function findMaxYear(node) {
        if (node.born > maxYear) {
          maxYear = node.born;
        }
        if (node.children) {
          node.children.forEach(findMaxYear);
        }
      }
      findMaxYear(data);

      const y = d3.scaleLinear().domain([1871, maxYear]).range([0, diameter / 2 - 100]);
      const yearToY = (year) => y(year);

      const getY = (d) => yearToY(d.data.born);

      const tree = d3.tree()
        .size([360, 100]) // The radius is now controlled by year, so this is just for the angle.
        .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

      const root = d3.hierarchy(data);
      tree(root);

      const svg = d3.select(ref.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);

      const linkRadial = d3.linkRadial()
        .angle(d => d.x / 180 * Math.PI)
        .radius(d => d.y);

      const link = svg.selectAll('.link')
        .data(root.links())
        .enter().append('path')
        .attr('class', 'link')
        .attr('d', d => {
            const source = { x: d.source.x, y: getY(d.source) };
            const target = { x: d.target.x, y: getY(d.target) };
            if (d.source.data.firstname === "") {
                source.x = d.target.x;
            }
            return linkRadial({source, target});
        });

      const node = svg.selectAll('.node')
        .data(root.descendants())
        .enter().append('g')
        .attr('class', d => `node ${d.children ? 'node--internal' : 'node--leaf'}`)
        .attr('transform', d => `rotate(${d.x - 90})translate(${getY(d)})`);

      node.append('circle')
        .attr('r', 4.5);

      node.append('text')
        .attr('dy', '.31em')
        .attr('text-anchor', d => d.depth === 0 ? 'middle' : (d.x < 180 ? 'start' : 'end'))
        .attr('transform', d => d.depth === 0 ? 'translate(-10, 0) rotate(270)' : (d.x < 180 ? 'translate(8)' : 'rotate(180)translate(-8)'))
        .text(d => d.data.firstname);

    }
  }, [data]);

  return (
    <div ref={ref} style={{ width: '100%', height: '800px' }}></div>
  );
};

export default D3Tree;
