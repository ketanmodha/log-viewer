import { useEffect, useState } from "react";
import { Spinner } from "react-bootstrap";

const Loader = ({
  className = "rounded-3",
  isVisible = false, // Control visibility
  height = "100%",
  top = "0",
  backgroundColor = "rgba(255, 255, 255, 0.7)",
  zIndex = 50,
  borderRadius = "inherit",
  spinnerSize = "lg",
  spinnerVariant = "primary",
  customLoader = null, // Option to use a custom loader component
  transitionDuration = 300, // Smooth transition duration in ms
}) => {
  const [shouldRender, setShouldRender] = useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timeout = setTimeout(
        () => setShouldRender(false),
        transitionDuration
      );
      return () => clearTimeout(timeout);
    }
  }, [isVisible, transitionDuration]);

  if (!shouldRender) return null; // Completely remove from DOM when not visible

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        top,
        left: 0,
        width: "100%",
        height,
        zIndex,
        backgroundColor,
        borderRadius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: isVisible ? 1 : 0, // Smooth opacity transition
        visibility: isVisible ? "visible" : "hidden", // Prevent interactions when hidden
        transition: `opacity ${transitionDuration}ms ease-in-out, visibility ${transitionDuration}ms`,
      }}
    >
      {customLoader || (
        <Spinner
          size={spinnerSize}
          animation="border"
          variant={spinnerVariant}
        />
      )}
    </div>
  );
};

export default Loader;
