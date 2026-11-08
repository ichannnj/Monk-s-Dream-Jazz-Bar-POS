import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 items-center justify-center bg-stone-900 p-6">
          <View className="w-full max-w-lg rounded-2xl border border-rose-500/30 bg-stone-950 p-6 shadow-2xl">
            <View className="mb-4 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                <Text className="text-xl font-bold text-rose-500">!</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-black text-white">Something went wrong</Text>
                <Text className="text-xs font-medium text-stone-400">
                  Monk's Dream POS encountered an unexpected view error.
                </Text>
              </View>
            </View>

            <ScrollView className="max-h-48 rounded-xl bg-stone-900 p-3 mb-5 border border-stone-800">
              <Text className="text-xs font-mono text-rose-400 select-text">
                {this.state.error?.message || 'Unknown runtime error'}
              </Text>
              {this.state.errorInfo?.componentStack && (
                <Text className="mt-2 text-[10px] font-mono text-stone-500 select-text">
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </ScrollView>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={this.handleReset}
                activeOpacity={0.8}
                className="flex-1 items-center justify-center rounded-xl bg-amber-500 py-3 active:bg-amber-600"
              >
                <Text className="text-sm font-bold text-stone-950">Reload Application</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                activeOpacity={0.8}
                className="items-center justify-center rounded-xl border border-stone-700 px-4 py-3 active:bg-stone-800"
              >
                <Text className="text-sm font-semibold text-stone-300">Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
