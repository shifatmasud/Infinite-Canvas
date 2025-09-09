//SearchBar.tsx

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo, useLayoutEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"
import { gsap } from "gsap"

// A simple default SVG icon for the search bar
const DefaultSearchIcon = () => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
)

interface CardData {
    id: string
    title: string
    meta: string
}

interface SearchBarProps {
    cards: CardData[]
    onResultClick: (cardId: string) => void
    dimension?: { width?: number; height?: number }
    placeholderText?: string
    font?: React.CSSProperties
    appearance?: {
        backgroundColor?: string
        borderRadius?: number
        padding?: number
    }
    resultsAppearance?: {
        resultBackgroundColor?: string
        resultTextColor?: string
        resultMetaColor?: string
    }
    isExpanded?: boolean
    searchIcon?: React.ReactNode
    resultsPosition?: "top" | "bottom"
}

const defaultProps: SearchBarProps = {
    cards: [],
    onResultClick: () => {},
    isExpanded: true,
    searchIcon: <DefaultSearchIcon />,
    resultsPosition: "bottom",
    dimension: {
        width: 320,
        height: 48,
    },
    placeholderText: "Search cards...",
    font: {
        fontSize: 16,
        color: "#333333",
    },
    appearance: {
        backgroundColor: "white",
        borderRadius: 8,
        padding: 12,
    },
    resultsAppearance: {
        resultBackgroundColor: "white",
        resultTextColor: "#333333",
        resultMetaColor: "#777777",
    },
}

/**
 * @framerSupportedLayoutWidth auto
 * @framerSupportedLayoutHeight auto
 */
export default function SearchBar(props: SearchBarProps) {
    const {
        cards = defaultProps.cards,
        onResultClick = defaultProps.onResultClick,
        dimension = {},
        placeholderText = defaultProps.placeholderText,
        font: fontFromProps,
        appearance = {},
        resultsAppearance = {},
        isExpanded = defaultProps.isExpanded,
        searchIcon = defaultProps.searchIcon,
        resultsPosition = defaultProps.resultsPosition,
    } = props

    // Apply defaults for nested properties
    const font = { ...defaultProps.font, ...fontFromProps }
    const {
        width = defaultProps.dimension.width,
        height = defaultProps.dimension.height,
    } = dimension
    const {
        backgroundColor = defaultProps.appearance.backgroundColor,
        borderRadius = defaultProps.appearance.borderRadius,
        padding = defaultProps.appearance.padding,
    } = appearance
    const {
        resultBackgroundColor = defaultProps.resultsAppearance
            .resultBackgroundColor,
        resultTextColor = defaultProps.resultsAppearance.resultTextColor,
        resultMetaColor = defaultProps.resultsAppearance.resultMetaColor,
    } = resultsAppearance

    const [query, setQuery] = useState("")
    const [isInputFocused, setIsInputFocused] = useState(false)
    const [isUserExpanded, setIsUserExpanded] = useState(false)

    const isVisible = isExpanded || isUserExpanded

    const isMounted = useRef(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const inputWrapperRef = useRef<HTMLDivElement>(null)
    const iconRef = useRef<HTMLDivElement>(null)
    const resultsRef = useRef<HTMLUListElement>(null)
    const onResultsHideComplete = useRef<(() => void) | null>(null)

    const filteredResults = useMemo(() => {
        if (!query) return []
        const lowerCaseQuery = query.toLowerCase()
        return cards.filter(
            (card) =>
                card.title.toLowerCase().includes(lowerCaseQuery) ||
                card.meta.toLowerCase().includes(lowerCaseQuery)
        )
    }, [query, cards])

    const handleResultClick = (cardId: string) => {
        onResultClick(cardId)
        setQuery("")
        // This triggers the results list to start animating out
        setIsInputFocused(false)

        // If the bar is collapsible, set a callback for the results animation to trigger the collapse
        if (!isExpanded) {
            onResultsHideComplete.current = () => {
                setIsUserExpanded(false)
                onResultsHideComplete.current = null // Clean up to prevent stale calls
            }
        }
    }

    const showResults = isInputFocused && query.length > 0

    // GSAP Animation for expanding/collapsing
    useLayoutEffect(() => {
        const wrapper = wrapperRef.current
        const inputWrapper = inputWrapperRef.current
        const icon = iconRef.current
        if (!wrapper || !inputWrapper || !icon) return

        gsap.killTweensOf([wrapper, inputWrapper, icon])

        gsap.set(icon, { yPercent: -50 })

        const DURATION = 0.6
        const EASE = "expo.inOut"

        // On initial mount, set styles without animation
        if (!isMounted.current) {
            if (isVisible) {
                gsap.set(wrapper, { width })
                gsap.set(icon, { left: `${padding}px`, xPercent: 0 })
                gsap.set(inputWrapper, { opacity: 1 })
            } else {
                gsap.set(wrapper, { width: height })
                gsap.set(icon, { left: "50%", xPercent: -50 })
                gsap.set(inputWrapper, { opacity: 0 })
            }
            isMounted.current = true
            return
        }

        if (isVisible) {
            // --- EXPAND ---
            const tl = gsap.timeline({
                defaults: { duration: DURATION, ease: EASE },
            })
            tl.to(
                wrapper,
                {
                    width: width,
                },
                0
            )
                .to(
                    icon,
                    {
                        left: `${padding}px`,
                        xPercent: 0,
                    },
                    0
                )
                .to(
                    inputWrapper,
                    {
                        opacity: 1,
                        duration: DURATION * 0.5,
                        ease: "power1.inOut",
                    },
                    DURATION * 0.2
                )
        } else {
            // --- COLLAPSE ---
            const tl = gsap.timeline({
                defaults: { duration: DURATION, ease: EASE },
            })

            const fadeDuration = DURATION * 0.5
            const expandFadeDelay = DURATION * 0.2
            const collapseFadeDelay = DURATION - fadeDuration - expandFadeDelay

            tl.to(
                wrapper,
                {
                    width: height,
                },
                0
            )
                .to(
                    icon,
                    {
                        left: "50%",
                        xPercent: -50,
                    },
                    0
                )
                .to(
                    inputWrapper,
                    {
                        opacity: 0,
                        duration: fadeDuration,
                        ease: "power1.inOut",
                    },
                    collapseFadeDelay
                )
        }
    }, [isVisible, width, height, padding])

    // GSAP Animation for results dropdown
    useLayoutEffect(() => {
        const resultsContainer = resultsRef.current
        if (!resultsContainer) return

        gsap.killTweensOf(resultsContainer)
        const resultsItems = gsap.utils.toArray<HTMLElement>(".result-item")
        gsap.killTweensOf(resultsItems)

        const isBottom = resultsPosition === "bottom"
        // A small vertical shift for a soft "lift" or "drop" effect
        const yOffset = isBottom ? -12 : 12

        if (showResults) {
            resultsContainer.style.visibility = "visible"
            // Soft fade and slide-in for the container
            gsap.fromTo(
                resultsContainer,
                {
                    opacity: 0,
                    y: yOffset,
                },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.5,
                    ease: "expo.out",
                }
            )

            // Staggered fade-in for list items
            if (resultsItems.length) {
                gsap.fromTo(
                    resultsItems,
                    { opacity: 0, y: 15 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.5,
                        ease: "expo.out",
                        stagger: 0.07,
                        delay: 0.1,
                    }
                )
            }
        } else {
            // Soft fade and slide-out for the container
            gsap.to(resultsContainer, {
                opacity: 0,
                y: yOffset,
                duration: 0.3,
                ease: "power2.in",
                onComplete: () => {
                    if (resultsRef.current) {
                        resultsRef.current.style.visibility = "hidden"
                        // Reset transform for the next time it opens
                        gsap.set(resultsRef.current, { y: 0 })
                    }
                    // If a collapse callback is pending, execute it
                    if (onResultsHideComplete.current) {
                        onResultsHideComplete.current()
                    }
                },
            })
        }
    }, [showResults, filteredResults, resultsPosition])

    // Styles derived from props
    const searchContainerStyle: React.CSSProperties = {
        position: "relative",
        zIndex: 1000,
        fontFamily: font.fontFamily || "'Inter', system-ui, sans-serif",
    }

    const wrapperStyle: React.CSSProperties = {
        position: "relative",
        height: height,
        display: "flex",
        alignItems: "center",
        backgroundColor: backgroundColor,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        border: "1px solid #ddd",
        cursor: !isExpanded ? "pointer" : "default",
        overflow: "clip",
        borderRadius: "88px",
    }

    const iconContainerStyle: React.CSSProperties = {
        position: "absolute",
        top: "50%",
        display: "grid",
        placeItems: "center",
        color: font.color,
        zIndex: 2,
    }

    const inputWrapperStyle: React.CSSProperties = {
        position: "relative",
        width: "100%",
        height: "100%",
    }

    const searchInputStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        padding: `${padding}px ${padding}px ${padding}px ${padding * 2 + 20}px`,
        backgroundColor: "transparent",
        border: "none",
        outline: "none",
        boxSizing: "border-box",
        WebkitAppearance: "none",
        whiteSpace: "nowrap",
        ...font,
    }

    const resultsContainerStyle: React.CSSProperties = {
        position: "absolute",
        ...(resultsPosition === "bottom"
            ? { top: `calc(100% + 8px)` }
            : { bottom: `calc(100% + 8px)` }),
        left: 0,
        width: "100%",
        listStyle: "none",
        padding: "0",
        margin: "0",
        backgroundColor: resultBackgroundColor,
        borderRadius: `${borderRadius}px`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        maxHeight: "400px",
        overflowY: "auto",
        border: "1px solid #eee",
        zIndex: 999,
        visibility: "hidden",
    }

    const resultItemStyle: React.CSSProperties = {
        padding: `${padding}px`,
        cursor: "pointer",
        borderBottom: "1px solid #eee",
    }

    const dynamicGlobalStyles = `
        .search-input-field::placeholder {
            color: ${font.color};
            opacity: 0.5;
        }
        .results-container::-webkit-scrollbar {
            width: 0;
            height: 0;
        }
        .results-container {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none;  /* IE and Edge */
        }
    `

    return (
        <div style={searchContainerStyle}>
            <style>{dynamicGlobalStyles}</style>
            <div
                ref={wrapperRef}
                style={wrapperStyle}
                onClick={() => !isExpanded && setIsUserExpanded(true)}
            >
                <div ref={iconRef} style={iconContainerStyle}>
                    {searchIcon}
                </div>
                <div ref={inputWrapperRef} style={inputWrapperStyle}>
                    <input
                        className="search-input-field"
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() =>
                            setTimeout(() => setIsInputFocused(false), 200)
                        }
                        placeholder={placeholderText}
                        style={searchInputStyle}
                        aria-label="Search cards by title or meta data"
                        disabled={!isVisible}
                    />
                </div>
            </div>
            <ul
                ref={resultsRef}
                className="results-container"
                style={resultsContainerStyle}
                role="listbox"
            >
                {filteredResults.length > 0
                    ? filteredResults.map((card) => (
                          <li
                              key={card.id}
                              className="result-item"
                              style={resultItemStyle}
                              onMouseDown={() => handleResultClick(card.id)}
                              onMouseEnter={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                      "#f9f9f9")
                              }
                              onMouseLeave={(e) =>
                                  (e.currentTarget.style.backgroundColor =
                                      resultBackgroundColor)
                              }
                              role="option"
                              aria-selected="false"
                          >
                              <strong
                                  style={{
                                      color: resultTextColor,
                                      fontSize: `${font.fontSize}px`,
                                  }}
                              >
                                  {card.title}
                              </strong>
                              <br />
                              <small
                                  style={{
                                      color: resultMetaColor,
                                      fontSize: `${
                                          (font.fontSize as number) * 0.8
                                      }px`,
                                  }}
                              >
                                  {card.meta}
                              </small>
                          </li>
                      ))
                    : query.length > 0 && (
                          <li
                              className="result-item"
                              style={{
                                  ...resultItemStyle,
                                  cursor: "default",
                                  color: resultMetaColor,
                              }}
                          >
                              No results found
                          </li>
                      )}
            </ul>
        </div>
    )
}

SearchBar.displayName = "SearchBar"
SearchBar.defaultProps = defaultProps

addPropertyControls(SearchBar, {
    searchIcon: {
        type: ControlType.ComponentInstance,
        title: "Icon",
    },
    isExpanded: {
        type: ControlType.Boolean,
        title: "Expanded",
        description:
            "If the search bar is permanently expanded or starts as an icon.",
        defaultValue: defaultProps.isExpanded,
    },
    placeholderText: {
        type: ControlType.String,
        title: "Placeholder",
        defaultValue: defaultProps.placeholderText,
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
                defaultValue: defaultProps.dimension.width,
                min: 40,
                max: 1000,
                step: 1,
            },
            height: {
                type: ControlType.Number,
                title: "Height",
                defaultValue: defaultProps.dimension.height,
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
                defaultValue: defaultProps.appearance.backgroundColor,
            },
            borderRadius: {
                type: ControlType.Number,
                title: "Radius",
                defaultValue: defaultProps.appearance.borderRadius,
                min: 0,
                max: 50,
                step: 1,
            },
            padding: {
                type: ControlType.Number,
                title: "Padding",
                defaultValue: defaultProps.appearance.padding,
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
                defaultValue:
                    defaultProps.resultsAppearance.resultBackgroundColor,
            },
            resultTextColor: {
                type: ControlType.Color,
                title: "Title Color",
                defaultValue: defaultProps.resultsAppearance.resultTextColor,
            },
            resultMetaColor: {
                type: ControlType.Color,
                title: "Meta Color",
                defaultValue: defaultProps.resultsAppearance.resultMetaColor,
            },
        },
    },
})
