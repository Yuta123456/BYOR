export const createDom = (fiber) => {
  // textNodeであればそれを、そうでなければ指定されたDOMのtypeを作成
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type)
  updateDom(dom, {}, fiber.props)

  return dom
}

const isEvent = (key) => key.startsWith("on")
const isProperty = (key) =>
  key !== "children" && !isEvent(key)
const isNew = (prev, next) => (key) =>
  prev[key] !== next[key]
const isGone = (prev, next) => (key) =>
  !(key in next)

const updateDom = (dom, prevProps, nextProps) => {
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      (key) =>
        !(key in nextProps) ||
        isNew(prevProps, nextProps)(key)
    )
    .forEach((name) => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      dom.removeEventListener(
        eventType,
        prevProps[name]
      )
    })

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = ""
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom[name] = nextProps[name]
    })

  // add EventListeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name
        .toLowerCase()
        .substring(2)
      dom.addEventListener(
        eventType,
        nextProps[name]
      )
    })
}

const commitRoot = () => {
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  // remember the last fiber we mounted
  currentRoot = wipRoot
  wipRoot = null
}
const commitWork = (fiber) => {
  if (!fiber) {
    return
  }

  let domParentFiber = fiber.parent
  // find a DOM
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom
  // const domParent = fiber.parent.dom
  if (
    fiber.effectTag === "PLACEMENT" &&
    fiber.dom != null
  ) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent)
    domParent.removeChild(fiber.dom)
  } else if (
    fiber.effectTag === "UPDATE" &&
    fiber.dom != null
  ) {
    updateDom(
      fiber.dom,
      fiber.alternate.props,
      fiber.props
    )
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

const commitDeletion = (fiber, domParent) => {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}
export const render = (element, container) => {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    // the pointer to previous fiber
    alternate: currentRoot,
  }
  deletions = []
  // register wipRoot as next unit work
  nextUnitOfWork = wipRoot
}

let nextUnitOfWork = null
// Root of Dom which is rendered now
let currentRoot = null
let wipRoot = null
let deletions = null

const workLoop = (deadline) => {
  let shouldYield = false
  // console.log("workLoop fire")
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
  const isFunctionComponent =
    fiber.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }

  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

function updateFunctionComponent(fiber) {
  // TODO
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

const reconcileChildren = (wipFiber, elements) => {
  let index = 0
  let oldFiber =
    wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  while (
    index < elements.length ||
    oldFiber != null
  ) {
    const element = elements[index]
    let newFiber = null

    // compare type between current and wip
    // A. if the type is same, we will update only props
    // B. if type is different and there is a new element,
    //    it means we need to create new Dom node
    // C. if type is different and there is NOT a new element,
    //    it means we need to remove old Dom node
    const sameType =
      oldFiber &&
      element &&
      element.type === oldFiber.type

    // pattern A
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        // update props
        props: element.props,
        dom: oldFiber.dom,
        // we need to use wipFiber here, so we receive wipFiber
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      }
    }

    // pattern B
    if (!sameType && element) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      }
    }

    // pattern C
    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION"
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else if (element) {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}
