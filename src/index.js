import PropTypes from "prop-types";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import mergeRefs from "react-merge-refs";
import { InteractionManager, TextInput } from "react-native";

function useTimeout() {
  const handle = useRef();

  const start = useCallback((func, ms) => {
    handle.current = setTimeout(func, ms);
  }, []);

  const stop = useCallback(
    () => handle.current && clearTimeout(handle.current),
    []
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => stop(), []);

  return [start, stop];
}

const AnimatedNumber = forwardRef(
  (
    {
      disableTabularNums,
      formatter,
      steps,
      initialValue,
      style,
      textAlign,
      time,
      value,
      ...props
    },
    ref
  ) => {
    const currentValue = useRef(value);
    const initialValueRef = useRef(initialValue);
    const textInputRef = useRef();

    const [startAnimationTimeout, stopAnimationTimeout] = useTimeout();
    const [startInitialValueTimeout] = useTimeout();

    const isPositive = useMemo(() => value - currentValue.current > 0, [value]);
    const stepSize = useMemo(
      () => (value - currentValue.current) / Number(steps),
      [steps, value]
    );

    const animateNumber = useCallback(() => {
      const nextValue = currentValue.current + stepSize;
      const isComplete =
        (isPositive && nextValue >= value) ||
        (!isPositive && nextValue <= value);

      currentValue.current = isComplete ? value : nextValue;

      if (textInputRef.current) {
        textInputRef.current.setNativeProps({
          text: formatter(currentValue.current),
        });
      }

      if (isComplete) {
        stopAnimationTimeout();
      }
    }, [formatter, isPositive, stepSize, stopAnimationTimeout, value]);

    const startAnimateNumber = useCallback(() => {
      stopAnimationTimeout();
      InteractionManager.runAfterInteractions(() => {
        animateNumber();
        startAnimationTimeout(startAnimateNumber, Number(time));
      });
    }, [animateNumber, startAnimationTimeout, stopAnimationTimeout, time]);

    useEffect(() => {
      // If the component was resetted
      // We need to reset the number and restart the animation
      if (initialValueRef.current !== initialValue) {
        stopAnimationTimeout();
        currentValue.current = initialValue;
        startAnimateNumber();
        startInitialValueTimeout(() => {
          initialValueRef.current = initialValue;
        }, Number(time) + 1);
      } else if (currentValue.current !== value) {
        startAnimateNumber();
      }
    }, [
      initialValue,
      startAnimateNumber,
      startAnimationTimeout,
      startInitialValueTimeout,
      stopAnimationTimeout,
      time,
      value,
    ]);

    return (
      <TextInput
        {...props}
        editable={false}
        ref={mergeRefs([textInputRef, ref])}
        style={[
          {
            fontVariant: disableTabularNums ? undefined : ["tabular-nums"],
            textAlign,
          },
          style,
        ]}
        value={formatter(currentValue.current)}
      />
    );
  }
);

AnimatedNumber.propTypes = {
  disableTabularNums: PropTypes.bool,
  formatter: PropTypes.func,
  initialValue: PropTypes.number,
  steps: PropTypes.number,
  textAlign: PropTypes.oneOf(["auto", "center", "justify", "left", "right"]),
  time: PropTypes.number,
  value: PropTypes.number,
};

AnimatedNumber.defaultProps = {
  formatter: (value) => Number(value).toString(),
  steps: 10,
  textAlign: "right",
  time: 6,
};

export default AnimatedNumber;
