// Fixture translations of the sample dashboard, one per stack. Same shape the real translator prompt asks for:
// a `copy` object for all text, a `state` prop, kit components only, tokens only.

const REACT = (name: string) =>
  `import { Avatar, Badge, Button, Card, EmptyState, ErrorState, ListRow, PageHeader, Skeleton, SkeletonGroup } from '@app/ui'
import { Inbox } from 'lucide-react'

export const defaultCopy = {
  title: 'Overview',
  subtitle: 'Sales for the last 7 days',
  newOrder: 'New order',
  recent: 'Recent orders',
  viewAll: 'View all',
  loading: 'Loading orders',
  emptyTitle: 'No orders yet',
  emptyBody: 'Orders appear here as soon as your first customer checks out.',
  emptyAction: 'Share your store link',
  errorTitle: 'Orders could not be loaded',
  errorBody: 'Check your connection and try again.',
}

export type ${name}State = 'ready' | 'loading' | 'empty' | 'error'
export interface Order { id: string; customer: string; detail: string; amount: string; status: string; tone: 'success' | 'warning' | 'danger' }
export interface ${name}Props {
  state?: ${name}State
  orders?: Order[]
  copy?: typeof defaultCopy
  onRetry?: () => void
  onNewOrder?: () => void
}


export function ${name}({ state = 'ready', orders = [], copy = defaultCopy, onRetry, onNewOrder }: ${name}Props) {
  return (
    <>
      <PageHeader title={copy.title} description={copy.subtitle} actions={<Button onClick={onNewOrder}>{copy.newOrder}</Button>} />
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <h2 className="font-display text-base font-semibold">{copy.recent}</h2>
          <Button variant="secondary">{copy.viewAll}</Button>
        </div>
        {state === 'loading' && (
          <SkeletonGroup label={copy.loading} className="space-y-3 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </SkeletonGroup>
        )}
        {state === 'empty' && <EmptyState icon={<Inbox />} title={copy.emptyTitle} description={copy.emptyBody} action={<Button>{copy.emptyAction}</Button>} />}
        {state === 'error' && <ErrorState title={copy.errorTitle} message={copy.errorBody} onRetry={onRetry} />}
        {state === 'ready' && (
          <ul className="divide-y divide-border border-t border-border">
            {orders.map((o) => (
              <li key={o.id}>
                <ListRow leading={<Avatar name={o.customer} />} title={o.customer} subtitle={o.detail} trailing={<><Badge tone={o.tone}>{o.status}</Badge><span className="tabular-nums">{o.amount}</span></>} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

`;

const NATIVE = (name: string) =>
  `import { Pressable, ScrollView, Text, View } from 'react-native'

export const defaultCopy = {
  title: 'Overview',
  subtitle: 'Sales for the last 7 days',
  newOrder: 'New order',
  recent: 'Recent orders',
  emptyTitle: 'No orders yet',
  emptyBody: 'Orders appear here as soon as your first customer checks out.',
  errorTitle: 'Orders could not be loaded',
  retry: 'Try again',
  loading: 'Loading orders',
}

export interface Order { id: string; customer: string; detail: string; amount: string }
export interface ${name}Props {
  state?: 'ready' | 'loading' | 'empty' | 'error'
  orders?: Order[]
  copy?: typeof defaultCopy
  onRetry?: () => void
}

export function ${name}({ state = 'ready', orders = [], copy = defaultCopy, onRetry }: ${name}Props) {
  return (
    <ScrollView className="flex-1 bg-surface-muted" contentContainerClassName="gap-4 p-4">
      <View>
        <Text accessibilityRole="header" className="font-display text-2xl font-semibold text-text">{copy.title}</Text>
        <Text className="text-text-muted">{copy.subtitle}</Text>
      </View>
      <View className="overflow-hidden rounded-lg border border-border bg-surface">
        <Text className="p-4 font-display text-base font-semibold text-text">{copy.recent}</Text>
        {state === 'loading' && <Text accessibilityLabel={copy.loading} className="p-4 text-text-muted">{copy.loading}</Text>}
        {state === 'empty' && (
          <View className="gap-2 p-4">
            <Text className="font-semibold text-text">{copy.emptyTitle}</Text>
            <Text className="text-text-muted">{copy.emptyBody}</Text>
          </View>
        )}
        {state === 'error' && (
          <View className="gap-2 p-4">
            <Text className="font-semibold text-text">{copy.errorTitle}</Text>
            <Pressable accessibilityRole="button" onPress={onRetry} className="min-h-12 justify-center rounded-md border border-border px-4">
              <Text className="text-text">{copy.retry}</Text>
            </Pressable>
          </View>
        )}
        {state === 'ready' && orders.map((o) => (
          <View key={o.id} className="min-h-14 flex-row items-center justify-between border-t border-border px-4">
            <View>
              <Text className="font-medium text-text">{o.customer}</Text>
              <Text className="text-text-muted">{o.detail}</Text>
            </View>
            <Text className="text-text">{o.amount}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}
`;

const FLUTTER = (name: string) =>
  `import 'package:flutter/widgets.dart';
import 'package:forui/forui.dart';

class ${name}Copy {
  const ${name}Copy({
    this.title = 'Overview',
    this.subtitle = 'Sales for the last 7 days',
    this.recent = 'Recent orders',
    this.emptyTitle = 'No orders yet',
    this.emptyBody = 'Orders appear here as soon as your first customer checks out.',
    this.errorTitle = 'Orders could not be loaded',
    this.retry = 'Try again',
  });
  final String title, subtitle, recent, emptyTitle, emptyBody, errorTitle, retry;
}

enum ${name}State { ready, loading, empty, error }

class ${name} extends StatelessWidget {
  const ${name}({super.key, this.state = ${name}State.ready, this.orders = const [], this.copy = const ${name}Copy(), this.onRetry});
  final ${name}State state;
  final List<({String customer, String detail, String amount})> orders;
  final ${name}Copy copy;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = context.theme;
    return FScaffold(
      header: FHeader(title: Text(copy.title), suffixes: const []),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(copy.subtitle, style: theme.typography.sm.copyWith(color: theme.colors.mutedForeground)),
          const SizedBox(height: 16),
          FCard(
            title: Text(copy.recent),
            child: switch (state) {
              ${name}State.loading => const FProgress(),
              ${name}State.empty => Column(children: [Text(copy.emptyTitle), Text(copy.emptyBody)]),
              ${name}State.error => Column(children: [Text(copy.errorTitle), FButton(onPress: onRetry, child: Text(copy.retry))]),
              ${name}State.ready => Column(
                  children: [for (final o in orders) FTile(title: Text(o.customer), subtitle: Text(o.detail), suffix: Text(o.amount))],
                ),
            },
          ),
        ],
      ),
    );
  }
}
`;

export function fixtureScreenCode(kind: "react" | "react-native" | "flutter", name: string): string {
  return kind === "flutter" ? FLUTTER(name) : kind === "react-native" ? NATIVE(name) : REACT(name);
}
