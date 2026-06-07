import React from "react";

export class LegacyWidget extends React.Component {
  state = { value: this.props.value };

  componentWillReceiveProps(nextProps) {
    this.setState({ value: nextProps.value });
  }

  render() {
    return <span>{this.state.value}</span>;
  }
}
