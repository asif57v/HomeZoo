import React from 'react';
import { View } from 'react-native';
import { Text, Button } from './ui';
import { colors } from '../theme';

// App-level error boundary: a screen crash shows "something went wrong / retry" instead of a blank screen
export default class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch() {}
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.background, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.gray900 }}>Something went wrong</Text>
        <Text style={{ fontSize: 13, color: colors.gray500, textAlign: 'center' }}>An unexpected error occurred. Please try again.</Text>
        <Button title="Retry" onPress={() => this.setState({ hasError: false })} style={{ paddingHorizontal: 32 }} />
      </View>
    );
  }
}
