import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, View } from 'react-native';

import { Headshot } from '@/avatar/AvatarView';
import { useMe } from '@/hooks/queries';
import { Icon } from '@/ui/Icon';
import { Text } from '@/ui/Text';

import { makeRng } from './engines/common';
import { initRush, moveRush, PLAYER_Y, type RushState, stepRush } from './engines/orbRush';
import { type EngineViewProps, feedback, useGameLoop } from './useGameLoop';

export function RushView({ config, perks, running, seed, onScore, onOver }: EngineViewProps) {
  const me = useMe();
  const rng = useMemo(() => makeRng(seed), [seed]);
  const state = useRef<RushState>(initRush(config, perks));
  const [, setFrame] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const ended = useRef(false);
  const lastScore = useRef(0);

  const move = (dir: -1 | 1) => {
    if (!running) return;
    state.current = moveRush(state.current, dir);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderRelease: (e, g) => {
          if (Math.abs(g.dx) > 24) move(g.dx > 0 ? 1 : -1);
          else move(e.nativeEvent.locationX > size.w / 2 ? 1 : -1);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size.w, running],
  );

  useGameLoop(running, (dt) => {
    const r = stepRush(state.current, dt, rng);
    state.current = r.state;
    feedback(r.events);
    const sc = Math.floor(r.state.score);
    if (sc !== lastScore.current) {
      lastScore.current = sc;
      onScore(sc);
    }
    if (r.state.over && !ended.current) {
      ended.current = true;
      onOver(sc, { orbs: r.state.orbs, distance: Math.round(r.state.distance * 100) / 100, time: Math.round(r.state.time) });
    }
    setFrame((f) => (f + 1) % 1_000_000);
  });

  const s = state.current;
  const laneW = size.w / s.lanes;
  const unit = Math.min(laneW * 0.62, 64);
  return (
    <View style={{ flex: 1, backgroundColor: config.bg ?? '#120E2E' }} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} {...pan.panHandlers} testID="rush-area" accessibilityLabel="Orb Rush play area. Tap left or right to change lanes.">
      {Array.from({ length: s.lanes }, (_, i) => (
        <View key={i} style={{ position: 'absolute', left: i * laneW + 4, width: laneW - 8, top: 0, bottom: 0, backgroundColor: config.lane ?? '#1E1A4A', borderRadius: 18, opacity: 0.7 }} />
      ))}
      {size.h > 0
        ? s.entities.map((e) =>
            e.kind === 'block' ? (
              <View key={e.id} style={{ position: 'absolute', left: e.lane * laneW + (laneW - unit) / 2, top: e.y * size.h - unit / 2, width: unit, height: unit, borderRadius: 12, backgroundColor: config.block ?? '#FF4D6D', borderBottomWidth: 6, borderColor: 'rgba(0,0,0,0.25)' }}>
                <View style={{ position: 'absolute', top: 6, left: 6, width: unit * 0.3, height: unit * 0.18, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' }} />
              </View>
            ) : (
              <View key={e.id} style={{ position: 'absolute', left: e.lane * laneW + (laneW - unit * 0.6) / 2, top: e.y * size.h - unit * 0.3, width: unit * 0.6, height: unit * 0.6, borderRadius: unit * 0.3, backgroundColor: config.orb ?? '#FFC53D', alignItems: 'center', justifyContent: 'center', shadowColor: config.orb ?? '#FFC53D', shadowOpacity: 0.9, shadowRadius: 10, elevation: 6 }}>
                <View style={{ width: unit * 0.26, height: unit * 0.26, borderRadius: unit * 0.13, backgroundColor: 'rgba(255,255,255,0.7)' }} />
              </View>
            ),
          )
        : null}
      {size.h > 0 ? (
        <View style={{ position: 'absolute', left: s.playerX * laneW + (laneW - unit) / 2, top: PLAYER_Y * size.h - unit / 2, width: unit, height: unit, opacity: s.invulnerable > 0 && Math.floor(s.invulnerable * 10) % 2 === 0 ? 0.35 : 1 }}>
          <View style={{ position: 'absolute', top: -5, left: -5, right: -5, bottom: -5, borderRadius: unit, backgroundColor: config.player ?? '#22D3EE', opacity: 0.35 }} />
          <Headshot config={me.data?.avatar} size={unit} ring={config.player ?? '#22D3EE'} />
        </View>
      ) : null}
      <View style={{ position: 'absolute', top: 12, left: 12, flexDirection: 'row', gap: 4 }} accessibilityLabel={`${s.lives} lives left`}>
        {Array.from({ length: s.maxLives }, (_, i) => (
          <Icon key={i} name={i < s.lives ? 'heart' : 'heart-outline'} size={22} color="#FF4D6D" />
        ))}
      </View>
      <View style={{ position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 }} pointerEvents="box-none">
        {([-1, 1] as const).map((d) => (
          <Pressable key={d} onPress={() => move(d)} accessibilityRole="button" accessibilityLabel={d < 0 ? 'Move left' : 'Move right'} testID={d < 0 ? 'rush-left' : 'rush-right'} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={d < 0 ? 'chevron-back' : 'chevron-forward'} size={32} color="#fff" />
          </Pressable>
        ))}
      </View>
      <Text variant="small" color="rgba(255,255,255,0.6)" style={{ position: 'absolute', top: 16, right: 12 }}>
        {s.orbs} orbs · {(s.speed / s.startSpeed).toFixed(1)}×
      </Text>
    </View>
  );
}
