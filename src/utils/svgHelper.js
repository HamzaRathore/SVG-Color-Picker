export const isValidSVG = (file) => file?.type === "image/svg+xml";

// Converting color formats to hex
export const parseColor = (color) => {
  if (!color || ["none", "transparent", "currentColor", "rgba(0, 0, 0, 0)"].includes(color)) 
    return "#000000";
  if (color.startsWith("#")) return color;
  
  if (color.startsWith("rgb")) {
    const [r, g, b] = color.match(/\d+/g).map(Number);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).padStart(6, '0')}`;
  }
  
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.fillStyle = color;
  return ctx.fillStyle;
};

//Converts all SVG <style> tag class-based styles (for fill, stroke, and stop-color) into inline styles directly on the elements, then removes the classes and <style> tags.
export const flattenSvgStyles = (svgString) => {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
  const svgElement = svgDoc.documentElement;

  if (!svgElement) return svgString;

  Array.from(svgElement.querySelectorAll('style')).forEach(styleTag => {
    const rules = styleTag.textContent.matchAll(/\.([\w-]+)\s*\{([^}]+)\}/g);
    const cssRules = {};
    for (const [_, className, declarations] of rules) {
      cssRules[className] = {};
      declarations.split(';').forEach(decl => {
        const [prop, val] = decl.split(':').map(s => s.trim());
        if (prop && val && ['fill', 'stroke', 'stop-color'].includes(prop)) {
          cssRules[className][prop] = val;
        }
      });
    }
     // Apply inline styles and remove classes
    svgElement.querySelectorAll('[class]').forEach(el => {
      el.getAttribute('class').split(' ').forEach(cls => {
        if (cssRules[cls]) {   //if style is extracted from the class
          Object.entries(cssRules[cls]).forEach(([prop, val]) => {
            el.style[prop === 'stop-color' ? 'stopColor' : prop] = val;
          });
        }
      });
      el.removeAttribute('class');
    });
    
    styleTag.remove(); //// Remove the <style> tag
  });

  return new XMLSerializer().serializeToString(svgElement);
};