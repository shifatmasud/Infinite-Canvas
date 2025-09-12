//main.tsx

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {
    useRef,
    forwardRef,
    RefObject,
    useLayoutEffect,
    useState,
    useCallback,
    useEffect,
    CSSProperties,
    useMemo,
    // FIX: Import ComponentProps to correctly infer props type for SearchBar.
    ComponentProps,
} from "react"
import { gsap } from "gsap"
import { Observer } from "gsap/Observer"
import { addPropertyControls, ControlType, Frame } from "framer"
// FIX: Changed import to get SearchBar props via ComponentProps.
import SearchBar from "./SearchBar.tsx"

// ================================================================================================
// STYLES
// ================================================================================================

const getDynamicStyles = ({
    backgroundColor,
    cardColor,
    cardBorderColor,
    cardHeaderColor,
    cardTitleColor,
    cardMetaColor,
}) => `
:root {
  --bg-color: ${backgroundColor};
  --card-bg-color: ${cardColor};
  --card-border-color: ${cardBorderColor};
  --card-header-bg-color: ${cardHeaderColor};
  --card-title-color: ${cardTitleColor};
  --card-meta-color: ${cardMetaColor};
}

* {
  box-sizing: border-box;
}

.parallax-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  perspective: 1000px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  touch-action: none;
  background-color: var(--bg-color);
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  color: #333;
}

.parallax-container:active {
  cursor: grabbing;
}

.parallax-scene {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  will-change: transform;
}

.parallax-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
  transform-style: preserve-3d;
}

.parallax-tile {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
}

.card {
    position: absolute;
    background: var(--card-bg-color);
    border-radius: 8px;
    border: 1px solid var(--card-border-color);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    will-change: transform, opacity, filter;
    box-shadow: 0 10px 20px rgba(0,0,0,0.05), 0 3px 6px rgba(0,0,0,0.08);
    filter: saturate(1) blur(0px);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background-color: var(--card-header-bg-color);
    border-bottom: 1px solid var(--card-border-color);
    white-space: nowrap;
    flex-shrink: 0;
}

.card-title {
    font-weight: 600;
    color: var(--card-title-color);
}

.card-meta {
    color: var(--card-meta-color);
}

.card-content-wrapper {
    position: relative;
    background-color: transparent;
    overflow: hidden;
}

.card-content-wrapper img {
    display: block;
    width: 100%;
    height: auto;
}
`

const StyleInjector = (props) => <style>{getDynamicStyles(props)}</style>

// ================================================================================================
// DATA & TYPES
// ================================================================================================

interface CardPosition {
    x: number
    y: number
    scale: number
}

interface CardData {
    id: string
    layer: number
    title: string
    meta: string
    link?: string
    position: CardPosition
    content: React.ReactNode
}

// ================================================================================================
// CONFIGURATION
// ================================================================================================

interface LayerConfig {
    speed: number
    baseZ: number
    className: string
}

interface ParallaxConfig {
    layers: LayerConfig[]
    scrollSpeed: number
    baseWorldWidth: number
    baseWorldHeight: number
}

const generateTileOffsets = (size: number): { x: number; y: number }[] => {
    if (size % 2 === 0) {
        console.warn(
            "Tile offset grid size should be an odd number for a central tile."
        )
    }
    const offsets: { x: number; y: number }[] = []
    const half = Math.floor(size / 2)
    for (let y = -half; y <= half; y++) {
        for (let x = -half; x <= half; x++) {
            offsets.push({ x, y })
        }
    }
    return offsets
}

// ================================================================================================
// INTERACTION ENGINE
// ================================================================================================
gsap.registerPlugin(Observer)

interface InteractionCallbacks {
    onDrag: ({ deltaX, deltaY }: { deltaX: number; deltaY: number }) => void
    onWheelPan: ({ deltaX, deltaY }: { deltaX: number; deltaY: number }) => void
    onZoom: ({ deltaY, event }: { deltaY: number; event: WheelEvent }) => void
}

interface InteractionEngine {
    kill: () => void
    enable: () => void
    disable: () => void
}

function createInteractionEngine(
    target: HTMLElement,
    callbacks: InteractionCallbacks
): InteractionEngine {
    const observer = Observer.create({
        target,
        type: "wheel,pointer",
        dragMinimum: 2,
        onDrag: (self) => {
            callbacks.onDrag({ deltaX: -self.deltaX, deltaY: -self.deltaY })
        },
        onWheel: (self) => {
            const wheelEvent = self.event as WheelEvent
            if (wheelEvent.ctrlKey || wheelEvent.metaKey) {
                callbacks.onZoom({ deltaY: self.deltaY, event: wheelEvent })
            } else {
                callbacks.onWheelPan({
                    deltaX: -self.deltaX,
                    deltaY: -self.deltaY,
                })
            }
        },
        preventDefault: true,
    })

    return {
        kill: () => observer.kill(),
        enable: () => observer.enable(),
        disable: () => observer.disable(),
    }
}

// ================================================================================================
// REACT COMPONENTS
// ================================================================================================

interface CardProps {
    card: CardData
    isDragging: boolean
    isFocused: boolean
    isDimmed: boolean
    eventHandlers: {
        onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
    }
    onResize: (
        cardId: string,
        dimensions: { width: number; height: number }
    ) => void
    enableHoverEffect: boolean
    globalScale: number
    showCardHeaders: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            card,
            isDragging,
            isFocused,
            isDimmed,
            eventHandlers,
            onResize,
            enableHoverEffect,
            globalScale,
            showCardHeaders,
        },
        ref
    ) => {
        const hoverAnimationRef = useRef<gsap.core.Tween | null>(null)
        const elRef = useRef<HTMLDivElement>(null)
        const contentWrapperRef = useRef<HTMLDivElement>(null)

        const setRefs = useCallback(
            (node: HTMLDivElement | null) => {
                elRef.current = node
                if (typeof ref === "function") {
                    ref(node)
                } else if (ref) {
                    ref.current = node
                }
            },
            [ref]
        )

        useLayoutEffect(() => {
            const wrapper = contentWrapperRef.current
            if (!wrapper || !onResize) return

            const contentElement = wrapper.firstElementChild as HTMLElement
            if (!contentElement) return

            const observer = new ResizeObserver((entries) => {
                if (entries[0]) {
                    const { width, height } = entries[0].contentRect
                    const header = wrapper.previousElementSibling as HTMLElement
                    const headerHeight =
                        showCardHeaders && header ? header.offsetHeight : 0
                    onResize(card.id, { width, height: height + headerHeight })
                }
            })

            // For images, we need to wait for them to load
            if (contentElement.tagName === "IMG") {
                const img = contentElement as HTMLImageElement
                if (img.complete) {
                    observer.observe(contentElement)
                } else {
                    img.onload = () => observer.observe(contentElement)
                }
            } else {
                observer.observe(contentElement)
            }

            return () => observer.disconnect()
        }, [onResize, card.content, card.id, showCardHeaders])

        useLayoutEffect(() => {
            if (!elRef.current) return
            gsap.to(elRef.current, {
                scale: isDimmed
                    ? card.position.scale * globalScale * 0.95
                    : card.position.scale * globalScale,
                opacity: isDimmed ? 0.15 : 1,
                filter: isDimmed
                    ? "saturate(0) blur(2px)"
                    : "saturate(1) blur(0px)",
                duration: 0.7,
                ease: "power3.out",
            })
        }, [isDimmed, card.position.scale, globalScale])

        const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
            if (isDragging || isFocused || isDimmed || !enableHoverEffect)
                return
            if (hoverAnimationRef.current) hoverAnimationRef.current.kill()
            hoverAnimationRef.current = gsap.to(e.currentTarget, {
                scale: card.position.scale * globalScale * 1.05,
                duration: 0.5,
                ease: "power3.out",
            })
        }

        const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
            if (!isDragging && !isFocused) {
                if (hoverAnimationRef.current) hoverAnimationRef.current.kill()
                hoverAnimationRef.current = gsap.to(e.currentTarget, {
                    scale: card.position.scale * globalScale,
                    duration: 0.5,
                    ease: "power3.out",
                })
            }
        }

        const handleHeaderClick = (e: React.MouseEvent) => {
            if (card.link) {
                e.stopPropagation()
                window.open(card.link, "_blank", "noopener,noreferrer")
            }
        }

        return (
            <div
                className="card"
                ref={setRefs}
                onPointerEnter={handlePointerEnter}
                onPointerLeave={handlePointerLeave}
                onPointerDown={eventHandlers.onPointerDown}
                style={{ touchAction: "none" }}
            >
                {showCardHeaders && (
                    <div
                        className="card-header"
                        onClick={handleHeaderClick}
                        style={{ cursor: card.link ? "pointer" : "default" }}
                    >
                        <span className="card-title">{card.title}</span>
                        <span className="card-meta">{card.meta}</span>
                    </div>
                )}
                <div className="card-content-wrapper" ref={contentWrapperRef}>
                    {card.content}
                </div>
            </div>
        )
    }
)

interface ParallaxLayerProps {
    className: string
    cards: CardData[]
    config: ParallaxConfig
    cardRefs: RefObject<{ [key: string]: HTMLDivElement | null }>
    getCardEventHandlers: (
        card: CardData,
        tileIndex: number
    ) => {
        isDragging: boolean
        eventHandlers: {
            onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
        }
        enableHoverEffect: boolean
    }
    focusedCardId: string | null
    onCardResize: (
        cardId: string,
        dimensions: { width: number; height: number }
    ) => void
    TILE_OFFSETS: { x: number; y: number }[]
    globalScale: number
    showCardHeaders: boolean
}

const ParallaxLayer = forwardRef<HTMLDivElement, ParallaxLayerProps>(
    (
        {
            className,
            cards,
            config,
            cardRefs,
            getCardEventHandlers,
            focusedCardId,
            onCardResize,
            TILE_OFFSETS,
            globalScale,
            showCardHeaders,
        },
        ref
    ) => {
        return (
            <div className={`parallax-layer ${className}`} ref={ref}>
                {TILE_OFFSETS.map((offset, i) => (
                    <div key={i} className="parallax-tile">
                        {cards.map((card) => {
                            const {
                                isDragging,
                                eventHandlers,
                                enableHoverEffect,
                            } = getCardEventHandlers(card, i)
                            const isFocused = card.id === focusedCardId
                            const isDimmed =
                                focusedCardId !== null && !isFocused

                            return (
                                <Card
                                    key={`${card.id}-${i}`}
                                    card={card}
                                    ref={(el: HTMLDivElement | null) => {
                                        if (cardRefs.current) {
                                            cardRefs.current[
                                                `${card.id}-${i}`
                                            ] = el
                                        }
                                    }}
                                    isDragging={isDragging}
                                    isFocused={isFocused}
                                    isDimmed={isDimmed}
                                    eventHandlers={eventHandlers}
                                    onResize={onCardResize}
                                    enableHoverEffect={enableHoverEffect}
                                    globalScale={globalScale}
                                    showCardHeaders={showCardHeaders}
                                />
                            )
                        })}
                    </div>
                ))}
            </div>
        )
    }
)

// ================================================================================================
// PARALLAX HOOK
// ================================================================================================
type InteractionMode = "IDLE" | "PANNING" | "DRAGGING_CARD"

interface InteractionState {
    mode: InteractionMode
    cardId: string | null
    tileIndex: number | null
    pointerStart: { x: number; y: number }
    dragStartDelta: { x: number; y: number }
    liveDelta: { x: number; y: number }
}

interface CardDimensions {
    [key: string]: { width: number; height: number }
}

function useParallax(
    containerRef: RefObject<HTMLDivElement>,
    layerRefs: RefObject<(HTMLDivElement | null)[]>,
    sceneRef: RefObject<HTMLDivElement>,
    cardRefs: RefObject<{ [key: string]: HTMLDivElement | null }>,
    cards: CardData[],
    config: ParallaxConfig,
    cardDimensions: CardDimensions,
    interactionConfig: typeof defaultProps.interaction,
    tilingConfig: typeof defaultProps.tiling,
    TILE_OFFSETS: { x: number; y: number }[],
    focusedCardState: [
        string | null,
        React.Dispatch<React.SetStateAction<string | null>>,
    ]
) {
    const [focusedCardId, setFocusedCardId] = focusedCardState

    const {
        globalScale,
        enableDragPan,
        enableScrollPan,
        enableCardDrag,
        enableFocusClick,
        enableZoom,
        enableHoverEffect,
    } = interactionConfig
    const { tileGap } = tilingConfig

    const panPosition = useRef({ x: 0, y: 0 })
    const panVelocity = useRef({ x: 0, y: 0 })
    const cameraZ = useRef(0)
    const targetCameraZ = useRef(0)
    const zoomVelocity = useRef(0)
    const pinchStartCameraZ = useRef(0)
    const pinchStartDist = useRef<number | null>(null)
    const isPinching = useRef(false)
    const worldSize = useRef({
        width: config.baseWorldWidth,
        height: config.baseWorldHeight,
    })
    const viewportSize = useRef({ width: 0, height: 0 })
    const isInitialViewApplied = useRef(false)

    const draggedCardDeltas = useRef<{
        [key: string]: { x: number; y: number }
    }>({})

    const interactionState = useRef<InteractionState>({
        mode: "IDLE",
        cardId: null,
        tileIndex: null,
        pointerStart: { x: 0, y: 0 },
        dragStartDelta: { x: 0, y: 0 },
        liveDelta: { x: 0, y: 0 },
    })

    const [interactionEngine, setInteractionEngine] =
        useState<InteractionEngine | null>(null)
    const [activeDragCardId, setActiveDragCardId] = useState<string | null>(
        null
    )
    const lastDraggedCardId = useRef<string | null>(null)

    const internalTileIndex = useRef<number | null>(null)

    const setFocusedCard = useCallback(
        (id: string | null, tileIndex: number | null = null) => {
            setFocusedCardId(id)
            internalTileIndex.current = tileIndex
        },
        [setFocusedCardId]
    )

    const getEffectiveScale = useCallback(() => {
        const PERSPECTIVE = 1000
        const safeCameraZ = Math.min(cameraZ.current, PERSPECTIVE - 1)
        return PERSPECTIVE / (PERSPECTIVE - safeCameraZ)
    }, [])

    const handlePointerMove = useCallback(
        (event: PointerEvent) => {
            if (interactionState.current.mode !== "DRAGGING_CARD") return
            const { pointerStart } = interactionState.current
            const effectiveScale = getEffectiveScale()

            interactionState.current.liveDelta = {
                x: (event.clientX - pointerStart.x) / effectiveScale,
                y: (event.clientY - pointerStart.y) / effectiveScale,
            }
        },
        [getEffectiveScale]
    )

    const handlePointerUp = useCallback(() => {
        if (interactionState.current.mode !== "DRAGGING_CARD") return

        const { cardId, tileIndex, dragStartDelta, liveDelta } =
            interactionState.current

        const distance = Math.hypot(liveDelta.x, liveDelta.y)
        const isClick = distance < 5

        if (cardId) {
            lastDraggedCardId.current = cardId
            if (tileIndex !== null) {
                if (isClick) {
                    if (enableFocusClick) {
                        if (focusedCardId === null) {
                            setFocusedCard(cardId, tileIndex)
                        } else {
                            setFocusedCard(null)
                        }
                    }
                } else {
                    draggedCardDeltas.current[cardId] = {
                        x: dragStartDelta.x + liveDelta.x,
                        y: dragStartDelta.y + liveDelta.y,
                    }
                    setFocusedCard(null)
                }
            }
        }

        interactionState.current = {
            ...interactionState.current,
            mode: "IDLE",
            cardId: null,
            tileIndex: null,
            liveDelta: { x: 0, y: 0 },
        }
        setActiveDragCardId(null)

        window.removeEventListener("pointermove", handlePointerMove)
        window.removeEventListener("pointerup", handlePointerUp)
    }, [handlePointerMove, setFocusedCard, enableFocusClick, focusedCardId])

    const handlePointerDown = useCallback(
        (
            card: CardData,
            tileIndex: number,
            event: React.PointerEvent<HTMLDivElement>
        ) => {
            event.preventDefault()
            event.stopPropagation()

            interactionState.current = {
                mode: "DRAGGING_CARD",
                cardId: card.id,
                tileIndex,
                pointerStart: { x: event.clientX, y: event.clientY },
                dragStartDelta: draggedCardDeltas.current[card.id] || {
                    x: 0,
                    y: 0,
                },
                liveDelta: { x: 0, y: 0 },
            }
            setActiveDragCardId(card.id)

            window.addEventListener("pointermove", handlePointerMove)
            window.addEventListener("pointerup", handlePointerUp)
        },
        [handlePointerMove, handlePointerUp]
    )

    const getCardEventHandlers = useCallback(
        (card: CardData, tileIndex: number) => ({
            isDragging: card.id === activeDragCardId,
            eventHandlers: {
                onPointerDown: enableCardDrag
                    ? (e: React.PointerEvent<HTMLDivElement>) =>
                          handlePointerDown(card, tileIndex, e)
                    : () => {},
            },
            enableHoverEffect,
        }),
        [activeDragCardId, handlePointerDown, enableCardDrag, enableHoverEffect]
    )

    useLayoutEffect(() => {
        const container = containerRef.current
        if (!container) return
        const scene = sceneRef.current
        if (!scene) return

        let layoutScaleFactor = 1

        const updateLayout = () => {
            viewportSize.current = {
                width: container.clientWidth,
                height: container.clientHeight,
            }

            // By setting a fixed world size and scale factor, we disable the responsive layout scaling.
            // The canvas will still fill its container, but the arrangement and scale of cards
            // within the parallax world will not change based on the viewport size.
            const newWorldWidth = config.baseWorldWidth
            layoutScaleFactor = 1 // It's baseWorldWidth / baseWorldWidth
            const newWorldHeight = config.baseWorldHeight * layoutScaleFactor

            worldSize.current = { width: newWorldWidth, height: newWorldHeight }

            if (
                !isInitialViewApplied.current &&
                worldSize.current.width > 0 &&
                viewportSize.current.width > 0
            ) {
                // Center the view on the world origin (0,0) on initial load, using layer 1 as the reference.
                const referenceLayerSpeed = config.layers[1].speed // Mid layer
                if (referenceLayerSpeed > 0) {
                    panPosition.current.x =
                        (viewportSize.current.width / 2 -
                            worldSize.current.width / 2) /
                        referenceLayerSpeed
                    panPosition.current.y =
                        (viewportSize.current.height / 2 -
                            worldSize.current.height / 2) /
                        referenceLayerSpeed
                } else {
                    // Fallback for speed = 0, though unlikely for mid layer
                    panPosition.current.x = -worldSize.current.width / 2
                    panPosition.current.y = -worldSize.current.height / 2
                }

                // Set an initial zoom-out to give a better overview
                const initialZoom = -4000
                cameraZ.current = initialZoom
                targetCameraZ.current = initialZoom

                isInitialViewApplied.current = true
            }

            const allCards = cardRefs.current
            if (!allCards) return

            layerRefs.current?.forEach((layer) => {
                if (!layer) return
                const tiles =
                    layer.querySelectorAll<HTMLDivElement>(".parallax-tile")
                tiles.forEach((tile, i) => {
                    const offset = TILE_OFFSETS[i]
                    gsap.set(tile, {
                        transform: `translate(${offset.x * (newWorldWidth + tileGap)}px, ${offset.y * (newWorldHeight + tileGap)}px)`,
                    })
                })
            })

            cards.forEach((card) => {
                const draggedDelta = draggedCardDeltas.current[card.id] || {
                    x: 0,
                    y: 0,
                }
                const initialX =
                    newWorldWidth / 2 + card.position.x * layoutScaleFactor
                const initialY =
                    newWorldHeight / 2 + card.position.y * layoutScaleFactor

                const dims = cardDimensions[card.id]
                const cardWidth = dims ? dims.width : 300
                const cardHeight = dims ? dims.height : 375

                TILE_OFFSETS.forEach((_, tileIndex) => {
                    const cardKey = `${card.id}-${tileIndex}`
                    const cardElement = allCards[cardKey]
                    if (cardElement) {
                        gsap.set(cardElement, {
                            x: initialX + draggedDelta.x,
                            y: initialY + draggedDelta.y,
                            width: cardWidth,
                            height: cardHeight,
                            scale: card.position.scale * globalScale,
                            z: 0,
                            boxShadow:
                                "0 10px 20px rgba(0,0,0,0.05), 0 3px 6px rgba(0,0,0,0.08)",
                        })
                    }
                })
            })
        }

        const resizeObserver = new ResizeObserver(updateLayout)
        resizeObserver.observe(container)
        updateLayout()

        const engine = createInteractionEngine(container, {
            onDrag: ({ deltaX, deltaY }) => {
                if (
                    isPinching.current ||
                    !enableDragPan ||
                    interactionState.current.mode !== "IDLE"
                )
                    return
                const speed = config.scrollSpeed
                const effectiveScale = getEffectiveScale()
                panVelocity.current.x -= (deltaX * speed) / effectiveScale
                panVelocity.current.y -= (deltaY * speed) / effectiveScale
            },
            onWheelPan: ({ deltaX, deltaY }) => {
                if (!enableScrollPan) return
                const speed = config.scrollSpeed
                const effectiveScale = getEffectiveScale()
                panVelocity.current.x += (deltaX * speed) / effectiveScale
                panVelocity.current.y += (deltaY * speed) / effectiveScale
            },
            onZoom: ({ deltaY, event }) => {
                if (!enableZoom) return
                const ZOOM_SPEED_MULTIPLIER = 4 // Was 5
                const ANTICIPATION_AMOUNT = 20 // Was 30
                const oldTargetZ = targetCameraZ.current
                const newTargetZ =
                    oldTargetZ +
                    (deltaY > 0 ? -ANTICIPATION_AMOUNT : ANTICIPATION_AMOUNT)
                const PERSPECTIVE = 1000
                let refLayerIndex = 1

                if (focusedCardId) {
                    const card = cards.find((c) => c.id === focusedCardId)
                    if (card) {
                        refLayerIndex = card.layer
                    }
                }
                const { speed, baseZ } = config.layers[refLayerIndex]
                const Z_old = baseZ + oldTargetZ
                const Z_new = baseZ + newTargetZ
                if (PERSPECTIVE - Z_old === 0 || PERSPECTIVE - Z_new === 0)
                    return
                const scale_ratio =
                    (PERSPECTIVE - Z_old) / (PERSPECTIVE - Z_new)
                const mx = event.clientX
                const my = event.clientY
                const cx = viewportSize.current.width / 2
                const cy = viewportSize.current.height / 2
                const dx = mx - cx
                const dy = my - cy
                const screen_shift_x = dx * (scale_ratio - 1)
                const screen_shift_y = dy * (scale_ratio - 1)
                const new_scale = PERSPECTIVE / (PERSPECTIVE - Z_new)
                if (speed === 0 || new_scale === 0) return
                const pan_impulse_x = -screen_shift_x / (speed * new_scale)
                const pan_impulse_y = -screen_shift_y / (speed * new_scale)
                panVelocity.current.x += pan_impulse_x
                panVelocity.current.y += pan_impulse_y
                targetCameraZ.current = newTargetZ
                zoomVelocity.current -= deltaY * ZOOM_SPEED_MULTIPLIER
            },
        })
        setInteractionEngine(engine)

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                isPinching.current = true
                e.preventDefault()
                const t1 = e.touches[0]
                const t2 = e.touches[1]
                pinchStartDist.current = Math.hypot(
                    t1.clientX - t2.clientX,
                    t1.clientY - t2.clientY
                )
                pinchStartCameraZ.current = targetCameraZ.current
            }
        }

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && pinchStartDist.current !== null) {
                e.preventDefault()
                if (!enableZoom) return

                const t1 = e.touches[0]
                const t2 = e.touches[1]
                const currentDist = Math.hypot(
                    t1.clientX - t2.clientX,
                    t1.clientY - t2.clientY
                )
                const scaleFactor = currentDist / pinchStartDist.current
                const pinchCenterX = (t1.clientX + t2.clientX) / 2
                const pinchCenterY = (t1.clientY + t2.clientY) / 2

                const MIN_CAMERA_Z = -4000
                const MAX_CAMERA_Z = 750
                const PERSPECTIVE = 1000

                const startZ = pinchStartCameraZ.current
                const startPerceivedScale = PERSPECTIVE / (PERSPECTIVE - startZ)
                const newPerceivedScale = startPerceivedScale * scaleFactor
                let newTargetZ = PERSPECTIVE - PERSPECTIVE / newPerceivedScale
                newTargetZ = gsap.utils.clamp(
                    MIN_CAMERA_Z,
                    MAX_CAMERA_Z,
                    newTargetZ
                )

                const oldTargetZ = targetCameraZ.current
                let refLayerIndex = 1
                if (focusedCardId) {
                    const card = cards.find((c) => c.id === focusedCardId)
                    if (card) refLayerIndex = card.layer
                }
                const { speed, baseZ } = config.layers[refLayerIndex]
                const Z_old = baseZ + oldTargetZ
                const Z_new = baseZ + newTargetZ
                if (PERSPECTIVE - Z_old === 0 || PERSPECTIVE - Z_new === 0)
                    return
                const scale_ratio =
                    (PERSPECTIVE - Z_old) / (PERSPECTIVE - Z_new)
                const mx = pinchCenterX
                const my = pinchCenterY
                const cx = viewportSize.current.width / 2
                const cy = viewportSize.current.height / 2
                const dx = mx - cx
                const dy = my - cy
                const screen_shift_x = dx * (scale_ratio - 1)
                const screen_shift_y = dy * (scale_ratio - 1)
                const new_scale = PERSPECTIVE / (PERSPECTIVE - Z_new)
                if (speed === 0 || new_scale === 0) return
                const pan_impulse_x = -screen_shift_x / (speed * new_scale)
                const pan_impulse_y = -screen_shift_y / (speed * new_scale)
                panVelocity.current.x += pan_impulse_x
                panVelocity.current.y += pan_impulse_y
                targetCameraZ.current = newTargetZ
            }
        }

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                isPinching.current = false
                pinchStartDist.current = null
            }
        }

        // FIX: Use AddEventListenerOptions which includes 'passive' to correctly type the event listener options.
        const options: AddEventListenerOptions = { passive: false }
        container.addEventListener("touchstart", handleTouchStart, options)
        container.addEventListener("touchmove", handleTouchMove, options)
        container.addEventListener("touchend", handleTouchEnd, options)
        container.addEventListener("touchcancel", handleTouchEnd, options)

        const ticker = gsap.ticker.add(() => {
            const layerElements = layerRefs.current?.filter(
                (el) => el !== null
            ) as HTMLDivElement[] | undefined
            if (!layerElements || !scene) return

            // --- SMOOTHING & DAMPING CONSTANTS (Tweaked for a more fluid feel) ---
            // The LERP factor determines how quickly the camera moves to its target. Lower is smoother.
            const LERP_FACTOR_FOCUS = 0.08
            const LERP_FACTOR_FREE = 0.07 // Was 0.1
            // Damping factor determines friction. Higher values (closer to 1) mean less friction and longer coasting.
            const PAN_DAMPING_FACTOR = 0.94 // Was 0.9
            const ZOOM_DAMPING_FACTOR = 0.92 // Was 0.88
            // --------------------------------------------------------------------

            const MIN_CAMERA_Z = -4000
            const MAX_CAMERA_Z = 750

            targetCameraZ.current += zoomVelocity.current
            targetCameraZ.current = gsap.utils.clamp(
                MIN_CAMERA_Z,
                MAX_CAMERA_Z,
                targetCameraZ.current
            )
            zoomVelocity.current *= ZOOM_DAMPING_FACTOR
            cameraZ.current +=
                (targetCameraZ.current - cameraZ.current) * LERP_FACTOR_FREE

            panPosition.current.x += panVelocity.current.x
            panPosition.current.y += panVelocity.current.y
            panVelocity.current.x *= PAN_DAMPING_FACTOR
            panVelocity.current.y *= PAN_DAMPING_FACTOR

            if (focusedCardId && internalTileIndex.current !== null) {
                const card = cards.find((c) => c.id === focusedCardId)
                const tileIndex = internalTileIndex.current

                if (card) {
                    const layerConfig = config.layers[card.layer]
                    const draggedDelta = draggedCardDeltas.current[card.id] || {
                        x: 0,
                        y: 0,
                    }
                    const tileOffset = TILE_OFFSETS[tileIndex]

                    const cardInTilePos = {
                        x:
                            worldSize.current.width / 2 +
                            card.position.x * layoutScaleFactor +
                            draggedDelta.x,
                        y:
                            worldSize.current.height / 2 +
                            card.position.y * layoutScaleFactor +
                            draggedDelta.y,
                    }

                    const dims = cardDimensions[card.id]
                    const cardUnscaledWidth = dims ? dims.width : 300
                    const cardUnscaledHeight = dims ? dims.height : 375

                    const cardCenterInTileX =
                        cardInTilePos.x + cardUnscaledWidth / 2
                    const cardCenterInTileY =
                        cardInTilePos.y + cardUnscaledHeight / 2

                    const cardWorldCenterX =
                        cardCenterInTileX +
                        tileOffset.x * (worldSize.current.width + tileGap)
                    const cardWorldCenterY =
                        cardCenterInTileY +
                        tileOffset.y * (worldSize.current.height + tileGap)

                    const viewportCenterX = viewportSize.current.width / 2
                    const viewportCenterY = viewportSize.current.height / 2
                    const targetLayerPanX = viewportCenterX - cardWorldCenterX
                    const targetLayerPanY = viewportCenterY - cardWorldCenterY

                    const cardTargetPanX = targetLayerPanX / layerConfig.speed
                    const cardTargetPanY = targetLayerPanY / layerConfig.speed

                    const cardActualWidth =
                        cardUnscaledWidth * card.position.scale * globalScale
                    const cardActualHeight =
                        cardUnscaledHeight * card.position.scale * globalScale

                    const PERSPECTIVE = 1000
                    const targetPerceivedSize =
                        Math.min(
                            viewportSize.current.width,
                            viewportSize.current.height
                        ) * 0.8
                    const requiredScale =
                        targetPerceivedSize /
                        Math.max(cardActualWidth, cardActualHeight)

                    let cardTargetZ =
                        PERSPECTIVE -
                        PERSPECTIVE / requiredScale -
                        layerConfig.baseZ
                    cardTargetZ = gsap.utils.clamp(
                        MIN_CAMERA_Z,
                        MAX_CAMERA_Z,
                        cardTargetZ
                    )

                    const panPeriodX =
                        layerConfig.speed > 0
                            ? (worldSize.current.width + tileGap) /
                              layerConfig.speed
                            : 0
                    const panPeriodY =
                        layerConfig.speed > 0
                            ? (worldSize.current.height + tileGap) /
                              layerConfig.speed
                            : 0
                    const panDiffX = panPosition.current.x - cardTargetPanX
                    const panDiffY = panPosition.current.y - cardTargetPanY
                    const wrapX =
                        panPeriodX > 0 ? Math.round(panDiffX / panPeriodX) : 0
                    const wrapY =
                        panPeriodY > 0 ? Math.round(panDiffY / panPeriodY) : 0
                    const closestTargetPanX =
                        cardTargetPanX + wrapX * panPeriodX
                    const closestTargetPanY =
                        cardTargetPanY + wrapY * panPeriodY

                    panPosition.current.x +=
                        (closestTargetPanX - panPosition.current.x) *
                        LERP_FACTOR_FOCUS
                    panPosition.current.y +=
                        (closestTargetPanY - panPosition.current.y) *
                        LERP_FACTOR_FOCUS
                    cameraZ.current +=
                        (cardTargetZ - cameraZ.current) * LERP_FACTOR_FOCUS
                }
            }

            gsap.set(scene, { z: cameraZ.current })
            layerElements.forEach((layer, i) => {
                const layerConfig = config.layers[i]
                const targetX = panPosition.current.x * layerConfig.speed
                const targetY = panPosition.current.y * layerConfig.speed
                const wrap = (value: number, max: number) =>
                    ((((value + max / 2) % max) + max) % max) - max / 2
                gsap.set(layer, {
                    x: wrap(targetX, worldSize.current.width + tileGap),
                    y: wrap(targetY, worldSize.current.height + tileGap),
                    z: layerConfig.baseZ,
                })
            })

            const { mode, cardId, dragStartDelta, liveDelta } =
                interactionState.current
            if (mode === "DRAGGING_CARD" && cardId && cardRefs.current) {
                const cardConfig = cards.find((c) => c.id === cardId)
                if (!cardConfig) return

                const initialX =
                    worldSize.current.width / 2 +
                    cardConfig.position.x * layoutScaleFactor
                const initialY =
                    worldSize.current.height / 2 +
                    cardConfig.position.y * layoutScaleFactor

                const liveX = initialX + dragStartDelta.x + liveDelta.x
                const liveY = initialY + dragStartDelta.y + liveDelta.y

                TILE_OFFSETS.forEach((_, tileIndex) => {
                    const cardKey = `${cardId}-${tileIndex}`
                    const cardElement = cardRefs.current?.[cardKey]
                    if (cardElement) {
                        gsap.to(cardElement, {
                            x: liveX,
                            y: liveY,
                            scale:
                                cardConfig.position.scale * globalScale * 1.05,
                            z: 100,
                            boxShadow:
                                "0 25px 50px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.1)",
                            duration: 0.3,
                            ease: "power2.out",
                            overwrite: "auto",
                        })
                    }
                })
            } else if (activeDragCardId === null && lastDraggedCardId.current) {
                const cardConfig = cards.find(
                    (c) => c.id === lastDraggedCardId.current
                )
                if (cardConfig) {
                    TILE_OFFSETS.forEach((_, tileIndex) => {
                        const cardKey = `${cardConfig.id}-${tileIndex}`
                        const el = cardRefs.current?.[cardKey]
                        if (el) {
                            gsap.to(el, {
                                scale: cardConfig.position.scale * globalScale,
                                z: 0,
                                boxShadow:
                                    "0 10px 20px rgba(0,0,0,0.05), 0 3px 6px rgba(0,0,0,0.08)",
                                duration: 0.4,
                                ease: "power2.out",
                                overwrite: "auto",
                            })
                        }
                    })
                }
                lastDraggedCardId.current = null
            }
        })

        return () => {
            resizeObserver.disconnect()
            engine.kill()
            gsap.ticker.remove(ticker)
            window.removeEventListener("pointermove", handlePointerMove)
            window.removeEventListener("pointerup", handlePointerUp)
            container.removeEventListener(
                "touchstart",
                handleTouchStart,
                options
            )
            container.removeEventListener("touchmove", handleTouchMove, options)
            container.removeEventListener("touchend", handleTouchEnd, options)
            container.removeEventListener(
                "touchcancel",
                handleTouchEnd,
                options
            )
        }
    }, [
        cards,
        config,
        cardDimensions,
        interactionConfig,
        tilingConfig,
        TILE_OFFSETS,
        focusedCardId,
        setFocusedCardId,
    ])

    return {
        getCardEventHandlers,
        setFocusedCard,
    }
}

// ================================================================================================
// DEFAULT PROPS
// ================================================================================================

const defaultProps = {
    width: "100%",
    height: "100%",
    appearance: {
        backgroundColor: "#f8f8f8",
        cardColor: "#ffffff",
        cardBorderColor: "#f0f0f0",
        cardHeaderColor: "rgba(255, 255, 255, 0.95)",
        cardTitleColor: "#333333",
        cardMetaColor: "#999999",
        showCardHeaders: true,
    },
    interaction: {
        scrollSpeed: 1,
        globalScale: 1,
        enableDragPan: true,
        enableScrollPan: true,
        enableCardDrag: true,
        enableFocusClick: true,
        enableZoom: true,
        enableHoverEffect: true,
    },
    layout: {
        layerFar: { speed: 0.3, baseZ: -600 },
        layerMid: { speed: 0.6, baseZ: -300 },
        layerNear: { speed: 1.0, baseZ: 0 },
    },
    tiling: {
        gridSize: 5,
        tileGap: 0,
    },
    cards: [
        {
            id: "c1",
            layer: 2,
            title: "Card 1",
            meta: "Foreground",
            link: "https://framer.com",
            position: { x: 150, y: -50, scale: 1.3 },
        },
        {
            id: "c2",
            layer: 1,
            title: "Card 2",
            meta: "Middleground",
            link: "https://react.dev",
            position: { x: 400, y: 450, scale: 1.1 },
        },
        {
            id: "c3",
            layer: 0,
            title: "Card 3",
            meta: "Background",
            link: "https://gsap.com",
            position: { x: 700, y: -500, scale: 1.2 },
        },
    ],
    contentSlots: [],
    showSearchBar: false,
    searchBarSettings: {
        position: "top-left",
        ...SearchBar.defaultProps,
    },
}

// ================================================================================================
// MAIN APP COMPONENT
// ================================================================================================
type SearchBarPosition =
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right"
    | "center-middle"
// FIX: Infer SearchBarProps from the component to resolve import issues.
type SearchBarProps = ComponentProps<typeof SearchBar>

type infinitecanvasProps = {
    cards?: {
        id?: string
        layer: number
        title: string
        meta: string
        link?: string
        position: { x: number; y: number; scale: number }
    }[]
    appearance?: typeof defaultProps.appearance
    interaction?: typeof defaultProps.interaction
    layout?: typeof defaultProps.layout
    tiling?: typeof defaultProps.tiling
    width?: string | number
    height?: string | number
    contentSlots?: React.ReactNode[]
    showSearchBar?: boolean
    // FIX: Add searchBarIcon to hoist it as a top-level prop.
    searchBarIcon?: React.ReactNode
    searchBarSettings?: Partial<
        SearchBarProps & { position: SearchBarPosition }
    >
}

const getSearchBarPositionStyle = (
    position: SearchBarPosition
): CSSProperties => {
    const baseStyle: CSSProperties = {
        position: "absolute",
        zIndex: 1000,
    }

    switch (position) {
        case "top-center":
            return {
                ...baseStyle,
                top: 20,
                left: "50%",
                transform: "translateX(-50%)",
            }
        case "top-right":
            return { ...baseStyle, top: 20, right: 20 }
        case "bottom-left":
            return { ...baseStyle, bottom: 20, left: 20 }
        case "bottom-center":
            return {
                ...baseStyle,
                bottom: 20,
                left: "50%",
                transform: "translateX(-50%)",
            }
        case "bottom-right":
            return { ...baseStyle, bottom: 20, right: 20 }
        case "center-middle":
            return {
                ...baseStyle,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            }
        case "top-left":
        default:
            return { ...baseStyle, top: 20, left: 20 }
    }
}

/**
 * @framerSupportedLayoutWidth fill
 * @framerSupportedLayoutHeight fill
 */
export function infinitecanvas({
    cards: rawCards = defaultProps.cards,
    appearance = defaultProps.appearance,
    interaction = defaultProps.interaction,
    layout = defaultProps.layout,
    tiling = defaultProps.tiling,
    width = defaultProps.width,
    height = defaultProps.height,
    contentSlots = defaultProps.contentSlots,
    showSearchBar = defaultProps.showSearchBar,
    searchBarSettings: rawSearchBarSettings,
    // FIX: Accept searchBarIcon as a direct prop.
    searchBarIcon,
}: infinitecanvasProps) {
    const idMapRef = useRef(new WeakMap<object, string>())
    const [cardDimensions, setCardDimensions] = useState<CardDimensions>({})
    const [focusedCardId, setFocusedCardId] = useState<string | null>(null)

    const searchBarSettings = {
        ...defaultProps.searchBarSettings,
        ...rawSearchBarSettings,
    }

    const handleCardResize = useCallback(
        (cardId: string, dimensions: { width: number; height: number }) => {
            setCardDimensions((prev) => {
                if (
                    prev[cardId]?.width === dimensions.width &&
                    prev[cardId]?.height === dimensions.height
                ) {
                    return prev
                }
                return { ...prev, [cardId]: dimensions }
            })
        },
        []
    )

    const cards = useMemo(() => {
        return (rawCards || [])
            .map((card, index) => {
                if (!card) return null

                let stableId = card.id
                if (!stableId) {
                    if (!idMapRef.current.has(card)) {
                        idMapRef.current.set(
                            card,
                            `c${Math.random().toString(36).substring(2, 9)}`
                        )
                    }
                    stableId = idMapRef.current.get(card)!
                }

                const contentNode = contentSlots[index] ?? null

                return {
                    ...card,
                    id: stableId,
                    content: contentNode,
                }
            })
            .filter(Boolean) as CardData[]
    }, [rawCards, contentSlots])

    const containerRef = useRef<HTMLDivElement>(null)
    const layerRefs = useRef<(HTMLDivElement | null)[]>([])
    const sceneRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

    const TILE_OFFSETS = useMemo(
        () => generateTileOffsets(tiling.gridSize),
        [tiling.gridSize]
    )

    const config = useMemo(
        () => ({
            layers: [
                {
                    speed: layout.layerFar.speed,
                    baseZ: layout.layerFar.baseZ,
                    className: "layer-far",
                },
                {
                    speed: layout.layerMid.speed,
                    baseZ: layout.layerMid.baseZ,
                    className: "layer-mid",
                },
                {
                    speed: layout.layerNear.speed,
                    baseZ: layout.layerNear.baseZ,
                    className: "layer-near",
                },
            ],
            scrollSpeed: interaction.scrollSpeed,
            baseWorldWidth: 4000,
            baseWorldHeight: 4000,
        }),
        [layout, interaction.scrollSpeed]
    )

    const { getCardEventHandlers, setFocusedCard } = useParallax(
        containerRef,
        layerRefs,
        sceneRef,
        cardRefs,
        cards,
        config,
        cardDimensions,
        interaction,
        tiling,
        TILE_OFFSETS,
        [focusedCardId, setFocusedCardId]
    )

    useEffect(() => {
        // If an external change causes the focused card to no longer exist, unfocus it.
        if (focusedCardId && !cards.some((c) => c.id === focusedCardId)) {
            setFocusedCardId(null)
        }
    }, [cards, focusedCardId])

    const handleBackgroundPointerDown = (
        e: React.PointerEvent<HTMLDivElement>
    ) => {
        if (e.target === e.currentTarget) {
            setFocusedCardId(null)
        }
    }

    const cardsByLayer = useMemo(
        () => [
            cards.filter((card) => card.layer === 0),
            cards.filter((card) => card.layer === 1),
            cards.filter((card) => card.layer === 2),
        ],
        [cards]
    )

    const handleResultClick = (cardId: string) => {
        const centralTileIndex = Math.floor(TILE_OFFSETS.length / 2)
        setFocusedCard(cardId, centralTileIndex)
    }

    const { position: searchBarPosition = "top-left" } = searchBarSettings
    const searchBarResultsPosition = searchBarPosition.includes("bottom")
        ? "top"
        : "bottom"

    return (
        <>
            <StyleInjector {...appearance} />
            <div
                className="parallax-container"
                ref={containerRef}
                onPointerDown={handleBackgroundPointerDown}
                role="application"
                aria-label="Interactive Parallax Directory"
                style={{ width, height }}
            >
                {showSearchBar && (
                    // FIX: Use type assertion to fix type error for search bar position.
                    <div
                        style={getSearchBarPositionStyle(
                            searchBarSettings.position as SearchBarPosition
                        )}
                    >
                        <SearchBar
                            cards={cards}
                            onResultClick={handleResultClick}
                            dimension={searchBarSettings.dimension}
                            placeholderText={searchBarSettings.placeholderText}
                            font={searchBarSettings.font}
                            appearance={searchBarSettings.appearance}
                            resultsAppearance={
                                searchBarSettings.resultsAppearance
                            }
                            isExpanded={searchBarSettings.isExpanded}
                            resultsPosition={searchBarResultsPosition}
                            // FIX: Pass the hoisted searchBarIcon prop, with a fallback.
                            searchIcon={
                                searchBarIcon ?? searchBarSettings.searchIcon
                            }
                        />
                    </div>
                )}
                <div className="parallax-scene" ref={sceneRef}>
                    {config.layers.map((layer, i) => (
                        <ParallaxLayer
                            key={i}
                            ref={(el) => {
                                layerRefs.current[i] = el
                            }}
                            className={layer.className}
                            cards={cardsByLayer[i]}
                            config={config}
                            cardRefs={cardRefs}
                            getCardEventHandlers={getCardEventHandlers}
                            focusedCardId={focusedCardId}
                            onCardResize={handleCardResize}
                            TILE_OFFSETS={TILE_OFFSETS}
                            globalScale={interaction.globalScale}
                            showCardHeaders={appearance.showCardHeaders}
                        />
                    ))}
                </div>
            </div>
        </>
    )
}

// ================================================================================================
// FRAMER PROPERTIES
// ================================================================================================
infinitecanvas.defaultProps = defaultProps

addPropertyControls(infinitecanvas, {
    showSearchBar: {
        type: ControlType.Boolean,
        title: "Search Bar",
        defaultValue: false,
    },
    // FIX: Hoist searchBarIcon control to top level to avoid nesting issues.
    searchBarIcon: {
        type: ControlType.ComponentInstance,
        title: "Search Icon",
        hidden: (props) => !props.showSearchBar,
    },
    searchBarSettings: {
        type: ControlType.Object,
        title: "Search Bar Settings",
        hidden: (props) => !props.showSearchBar,
        controls: {
            position: {
                type: ControlType.Enum,
                title: "Position",
                options: [
                    "top-left",
                    "top-center",
                    "top-right",
                    "bottom-left",
                    "bottom-center",
                    "bottom-right",
                    "center-middle",
                ],
                optionTitles: [
                    "Top Left",
                    "Top Center",
                    "Top Right",
                    "Bottom Left",
                    "Bottom Center",
                    "Bottom Right",
                    "Center Middle",
                ],
                defaultValue: "bottom-center",
            },
            isExpanded: {
                type: ControlType.Boolean,
                title: "Expanded",
                description:
                    "If the search bar is permanently expanded or starts as an icon.",
                defaultValue: false,
            },
            placeholderText: {
                type: ControlType.String,
                title: "Placeholder",
                defaultValue: "Search cards...",
            },
            font: {
                type: ControlType.Font,
                title: "Font",
            },
            dimension: {
                type: ControlType.Object,
                title: "Dimensions",
                controls: {
                    width: {
                        type: ControlType.Number,
                        title: "Width",
                        defaultValue: 320,
                        min: 40,
                        max: 1000,
                        step: 1,
                    },
                    height: {
                        type: ControlType.Number,
                        title: "Height",
                        defaultValue: 48,
                        min: 30,
                        max: 100,
                        step: 1,
                    },
                },
            },
            appearance: {
                type: ControlType.Object,
                title: "Appearance",
                controls: {
                    backgroundColor: {
                        type: ControlType.Color,
                        title: "Background",
                        defaultValue: "#FFFFFF",
                    },
                    borderRadius: {
                        type: ControlType.Number,
                        title: "Radius",
                        defaultValue: 8,
                        min: 0,
                        max: 50,
                        step: 1,
                    },
                    padding: {
                        type: ControlType.Number,
                        title: "Padding",
                        defaultValue: 12,
                        min: 0,
                        max: 50,
                        step: 1,
                    },
                },
            },
            resultsAppearance: {
                type: ControlType.Object,
                title: "Results",
                controls: {
                    resultBackgroundColor: {
                        type: ControlType.Color,
                        title: "Background",
                        defaultValue: "#FFFFFF",
                    },
                    resultTextColor: {
                        type: ControlType.Color,
                        title: "Title Color",
                        defaultValue: "#333333",
                    },
                    resultMetaColor: {
                        type: ControlType.Color,
                        title: "Meta Color",
                        defaultValue: "#777777",
                    },
                },
            },
        },
    },
    cards: {
        type: ControlType.Array,
        title: "Card Data",
        control: {
            type: ControlType.Object,
            title: "Card",
            controls: {
                title: {
                    type: ControlType.String,
                    title: "Title",
                    defaultValue: "New Card",
                },
                meta: {
                    type: ControlType.String,
                    title: "Meta",
                    defaultValue: "Meta Text",
                },
                link: {
                    type: ControlType.String,
                    title: "Link",
                    defaultValue: "",
                },
                layer: {
                    type: ControlType.Number,
                    title: "Layer",
                    min: 0,
                    max: 2,
                    step: 1,
                    displayStepper: true,
                    defaultValue: 1,
                },
                position: {
                    type: ControlType.Object,
                    title: "Position",
                    controls: {
                        x: {
                            type: ControlType.Number,
                            title: "X",
                            defaultValue: 0,
                        },
                        y: {
                            type: ControlType.Number,
                            title: "Y",
                            defaultValue: 0,
                        },
                        scale: {
                            type: ControlType.Number,
                            title: "Scale",
                            defaultValue: 1,
                            min: 0.1,
                            max: 5,
                            step: 0.1,
                        },
                    },
                },
            },
        },
    },
    contentSlots: {
        type: ControlType.Array,
        title: "Content Slots",
        control: {
            type: ControlType.ComponentInstance,
            title: "Content",
        },
    },
    appearance: {
        type: ControlType.Object,
        title: "Appearance",
        controls: {
            backgroundColor: {
                type: ControlType.Color,
                title: "Background",
                defaultValue: "#f8f8f8",
            },
            cardColor: {
                type: ControlType.Color,
                title: "Card Body",
                defaultValue: "#ffffff",
            },
            cardBorderColor: {
                type: ControlType.Color,
                title: "Card Border",
                defaultValue: "#f0f0f0",
            },
            cardHeaderColor: {
                type: ControlType.Color,
                title: "Card Header",
                defaultValue: "rgba(255, 255, 255, 0.95)",
            },
            cardTitleColor: {
                type: ControlType.Color,
                title: "Title Text",
                defaultValue: "#333333",
            },
            cardMetaColor: {
                type: ControlType.Color,
                title: "Meta Text",
                defaultValue: "#999999",
            },
            showCardHeaders: {
                type: ControlType.Boolean,
                title: "Show Headers",
                defaultValue: true,
            },
        },
    },
    interaction: {
        type: ControlType.Object,
        title: "Interaction",
        controls: {
            globalScale: {
                type: ControlType.Number,
                title: "Global Scale",
                defaultValue: 1,
                min: 0.1,
                max: 3,
                step: 0.05,
            },
            scrollSpeed: {
                type: ControlType.Number,
                title: "Scroll Speed",
                defaultValue: 1,
                min: 0.1,
                max: 5,
                step: 0.1,
            },
            enableDragPan: {
                type: ControlType.Boolean,
                title: "Drag Pan",
                defaultValue: true,
            },
            enableScrollPan: {
                type: ControlType.Boolean,
                title: "Scroll Pan",
                defaultValue: true,
            },
            enableCardDrag: {
                type: ControlType.Boolean,
                title: "Drag Cards",
                defaultValue: true,
            },
            enableFocusClick: {
                type: ControlType.Boolean,
                title: "Click to Focus",
                defaultValue: true,
            },
            enableZoom: {
                type: ControlType.Boolean,
                title: "Zoom",
                defaultValue: true,
            },
            enableHoverEffect: {
                type: ControlType.Boolean,
                title: "Hover Effect",
                defaultValue: true,
            },
        },
    },
    layout: {
        type: ControlType.Object,
        title: "Layout",
        controls: {
            layerFar: {
                type: ControlType.Object,
                title: "Far Layer (0)",
                controls: {
                    speed: {
                        type: ControlType.Number,
                        title: "Speed",
                        defaultValue: 0.3,
                        min: 0,
                        max: 2,
                        step: 0.1,
                    },
                    baseZ: {
                        type: ControlType.Number,
                        title: "Z-Depth",
                        defaultValue: -600,
                        min: -2000,
                        max: 0,
                        step: 10,
                    },
                },
            },
            layerMid: {
                type: ControlType.Object,
                title: "Mid Layer (1)",
                controls: {
                    speed: {
                        type: ControlType.Number,
                        title: "Speed",
                        defaultValue: 0.6,
                        min: 0,
                        max: 2,
                        step: 0.1,
                    },
                    baseZ: {
                        type: ControlType.Number,
                        title: "Z-Depth",
                        defaultValue: -300,
                        min: -2000,
                        max: 0,
                        step: 10,
                    },
                },
            },
            layerNear: {
                type: ControlType.Object,
                title: "Near Layer (2)",
                controls: {
                    speed: {
                        type: ControlType.Number,
                        title: "Speed",
                        defaultValue: 1.0,
                        min: 0,
                        max: 2,
                        step: 0.1,
                    },
                    baseZ: {
                        type: ControlType.Number,
                        title: "Z-Depth",
                        defaultValue: 0,
                        min: -2000,
                        max: 0,
                        step: 10,
                    },
                },
            },
        },
    },
    tiling: {
        type: ControlType.Object,
        title: "Tiling",
        controls: {
            gridSize: {
                type: ControlType.Number,
                title: "Grid Size",
                description:
                    "The number of tiles in each direction (odd numbers work best).",
                defaultValue: 5,
                min: 1,
                max: 9,
                step: 2,
                displayStepper: true,
            },
            tileGap: {
                type: ControlType.Number,
                title: "Tile Gap",
                description: "The spacing between repeating world tiles.",
                defaultValue: 0,
                min: 0,
                max: 1000,
                step: 10,
                displayStepper: true,
            },
        },
    },
})
