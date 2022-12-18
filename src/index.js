import { Didact } from "./Didact/Didact"
/** @jsx Didact.createElement */
const element = (
  <div style="background: salmon">
    <h1>Hello World</h1>
    <h2 style="text-align:right">from Didact</h2>
    <div>
      <div>
        <h3>I'm</h3>
        <h4>Yuta</h4>
        <h5>Tanaka</h5>
      </div>
    </div>
  </div>
)
const container = document.getElementById("root")
Didact.render(element, container)
