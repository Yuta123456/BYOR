export const render = (element, container) => {
  // textNodeであればそれを、そうでなければ指定されたDOMのtypeを作成
  const dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type)
  // 子ノード以外の情報をマップ
  const isProperty = (key) => key !== "children"
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = element.props[name]
    })
  element.props.children.forEach((child) => {
    render(child, dom)
  })

  container.appendChild(dom)
}
