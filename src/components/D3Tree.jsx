import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import familyData from '../family.json';
import './D3Tree.css';

const FULL_CIRCLE = 360;
const PADDING = 120;
const MAX_DEPTH = 6;

const collapseAllNodes = (root) => {
  root.descendants().forEach(d => {
    d._children = d.children;
    d.children = null;
  });
};

const createTreeLayout = (diameter) =>
  d3.tree()
    .size([FULL_CIRCLE, diameter / 2 - PADDING])
    .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

const D3Tree = ({ action, onActionComplete }) => {
  const ref = useRef();
  const rootRef = useRef();
  const yearScaleRef = useRef();

  const colorScale = d3.scaleSequential(d3.interpolateRainbow)
    .domain([0, MAX_DEPTH]);

  const applyNodeStyles = (circles) =>
    circles
      .attr('r', 4.5)
      .attr('fill', d => d._children ? colorScale(d.depth) : '#fff')
      .attr('stroke', d => colorScale(d.depth))
      .attr('stroke-width', 2);

  useEffect(() => {
    if (rootRef.current) return; // Early return

    // Clear and get dimensions
    ref.current.innerHTML = '';
    const { clientWidth: width, clientHeight: height } = ref.current;
    const diameter = Math.min(width, height);

    // Create and apply tree layout
    const tree = createTreeLayout(diameter);
    const root = d3.hierarchy(familyData);
    tree(root);

    // Find min and max years for the year scale
    let minYear = Infinity;
    let maxYear = -Infinity;
    root.each(d => {
      if (d.data.born) {
        if (d.data.born < minYear) minYear = d.data.born;
        if (d.data.born > maxYear) maxYear = d.data.born;
      }
    });

    // Create and store the year scale
    const yearScale = d3.scaleLinear()
      .domain([minYear, maxYear])
      .range([0, diameter / 2 - PADDING]);
    yearScaleRef.current = yearScale;

    // Override the y coordinate with the year scale
    root.each(d => {
      if (d.data.born) {
        d.y = yearScale(d.data.born);
      }
    });

    // Store root and collapse nodes
    rootRef.current = root;
    collapseAllNodes(root);

    // Create SVG with centered group
    const svg = d3.select(ref.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    update(root, svg, root);

    // Tooltip
    d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('z-index', '10')
      .style('visibility', 'hidden');
  }, []);

  useEffect(() => {
    if (action && rootRef.current) {
      if (action === 'expand') {
        expandAll(rootRef.current);
      } else if (action === 'collapse') {
        collapseLevel(rootRef.current);
      }
      update(rootRef.current, d3.select(ref.current).select('svg').select('g'), rootRef.current);
      onActionComplete();
    }
  }, [action, onActionComplete]);

  function expandAll(source) {
    source.descendants().forEach(d => {
      d.children = d._children;
    });
  }

  function collapseLevel(source) {
    let maxDepth = -1;
    source.each(d => {
      if (d.depth > maxDepth && d.children) {
        maxDepth = d.depth;
      }
    });

    if (maxDepth === -1) return;

    source.each(d => {
      if (d.depth === maxDepth) {
        d._children = d.children;
        d.children = null;
      }
    });
  }

  function update(source, svg, root) {
    const duration = 250;
    const nodes = root.descendants();
    const links = root.links();

    const tree = createTreeLayout(ref.current.clientWidth);
    tree(root);

    const yearScale = yearScaleRef.current;
    if (yearScale) {
      root.each(d => {
        if (d.data.born) {
          d.y = yearScale(d.data.born);
        }
      });
    }

    let left = root;
    let right = root;
    root.eachBefore(node => {
      if (node.x < left.x) left = node;
      if (node.x > right.x) right = node;
    });

    const height = right.x - left.x + 100;
    const width = ref.current.clientWidth;

    svg.transition()
        .duration(duration)
        .attr("height", height)
        .attr("viewBox", [-width / 2, left.x - 50, width, height]);

    const node = svg.selectAll('.node')
      .data(nodes, d => d.id || (d.id = Math.random()));

    const nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `rotate(${source.x0 - 90})translate(${source.y0})`)
      .on('click', (event, d) => {
        d.children = d.children ? null : d._children;
        update(d, svg, root);
      })
      .on('mouseover', function(event, d) {
        d3.select('body').select('.tooltip').style('visibility', 'visible')
          .html(`<strong>${d.data.firstname}${d.data.lastname ? ' ' + d.data.lastname : ''}</strong><br/>Born: ${d.data.born}`);
      })
      .on('mousemove', function(event) {
        d3.select('body').select('.tooltip').style('top', (event.pageY - 10) + 'px').style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select('body').select('.tooltip').style('visibility', 'hidden');
      });

    nodeEnter.append('text')
      .attr('dy', '.31em')
      .attr('text-anchor', d => d.x < 180 ? 'start' : 'end')
            .attr('transform', d => {
        if (d.depth === 0) return 'translate(8)rotate(0)';
        return d.x < 180 ? 'translate(8)' : 'rotate(180)translate(-8)';
      })
      .text(d => d.data.firstname);

    const nodeUpdate = node.merge(nodeEnter).transition()
      .duration(duration)
      .attr('transform', d => `rotate(${d.x - 90})translate(${d.y})`);

    applyNodeStyles(nodeEnter.append('circle'));
    applyNodeStyles(nodeUpdate.select('circle'));

    const nodeExit = node.exit().transition()
      .duration(duration)
      .attr('transform', d => `rotate(${source.x - 90})translate(${source.y})`)
      .remove();

    nodeExit.select('circle').attr('r', 1e-6);
    nodeExit.select('text').style('fill-opacity', 1e-6);

    const link = svg.selectAll('.link')
      .data(links, d => d.target.id);

    const linkEnter = link.enter().insert('path', 'g')
      .attr('class', 'link')
      .attr('d', d => {
        const o = {x: source.x0, y: source.y0};
        return d3.linkRadial()({source: o, target: o});
      });

    link.merge(linkEnter).transition()
      .duration(duration)
      .attr('d', d => {
        if (d.source.depth === 0) {
          const endX = d.target.y * Math.cos((d.target.x - 90) * Math.PI / 180);
          const endY = d.target.y * Math.sin((d.target.x - 90) * Math.PI / 180);
          return `M 0 0 L ${endX} ${endY}`;
        }
        return d3.linkRadial()
          .angle(d => d.x / 180 * Math.PI)
          .radius(d => d.y)(d);
      });

    link.exit().transition()
      .duration(duration)
      .attr('d', d => {
        const o = {x: source.x, y: source.y};
        return d3.linkRadial()({source: o, target: o});
      })
      .remove();

    root.eachBefore(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  return (
    <div ref={ref} style={{ width: '100%', height: '100vh' }}></div>
  );
};

export default D3Tree;
