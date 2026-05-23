import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CLARITY_BODY, CLARITY_HINT, CLARITY_MONO } from '@/components/admin/clarityTokens';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { api, type MemberFeedback } from '@/lib/api';
import { FEEDBACK_COMMENT_MAX } from '@/lib/feedbackConstants';

function StarPicker({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} disabled={disabled} onPress={() => onChange(n)} accessibilityRole="button">
          <Text style={[styles.star, n <= value ? styles.starOn : styles.starOff]}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function MemberFeedbackScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.status === 'signed_in' ? auth.token : null;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<MemberFeedback | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const fb = await api.memberFeedbackGet(token);
      setFeedback(fb);
      if (fb) {
        setRating(fb.rating);
        setComment(fb.comment);
        setEditing(false);
      } else {
        setRating(5);
        setComment('');
        setEditing(true);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not load feedback.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!token) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const fb = await api.memberFeedbackSave(token, rating, comment.trim());
      setFeedback(fb);
      setEditing(false);
      setMsg(
        fb.approved
          ? 'Feedback saved.'
          : 'Saved. It will appear on the site after admin approval.',
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!token || !feedback?.editable) return;
    Alert.alert('Delete feedback?', 'This cannot be undone until you submit again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.memberFeedbackDelete(token);
            setFeedback(null);
            setEditing(true);
            setComment('');
            setRating(5);
            setMsg('Feedback deleted.');
          } catch (e: unknown) {
            setErr(e instanceof Error ? e.message : 'Could not delete.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (!token) {
    return (
      <View style={[styles.center, { backgroundColor: c.surfaceMuted }]}>
        <Text style={{ color: c.ink600 }}>Sign in to leave feedback.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.surfaceMuted }}
      contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 20) + 16, gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[CLARITY_BODY, { color: c.ink600 }]}>
        Verified members can rate the library. Approved feedback may appear on the public homepage.
      </Text>

      {loading ? (
        <Text style={[CLARITY_HINT, { color: c.ink500 }]}>Loading…</Text>
      ) : (
        <Card style={{ padding: 16, gap: 12 }}>
          {feedback && !editing ? (
            <>
              <StarPicker value={feedback.rating} onChange={() => {}} disabled />
              <Text style={[styles.commentRead, { color: c.ink800 }]}>{feedback.comment}</Text>
              <Text style={[CLARITY_HINT, { color: c.ink500 }]}>
                {feedback.approved ? 'Approved for testimonials' : 'Pending admin approval'}
              </Text>
              {feedback.editable ? (
                <View style={styles.row}>
                  <Button title="Edit" variant="secondary" onPress={() => setEditing(true)} />
                  <Button title="Delete" variant="secondary" onPress={remove} />
                </View>
              ) : feedback.editAvailableFrom ? (
                <Text style={[CLARITY_HINT, { color: c.ink500 }]}>
                  Edit/delete unlocks after 30 days from posting.
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={[CLARITY_MONO, { color: c.ink500 }]}>YOUR RATING</Text>
              <StarPicker value={rating} onChange={setRating} />
              <Text style={[CLARITY_MONO, { color: c.ink500 }]}>COMMENT</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder="Share your experience…"
                placeholderTextColor={c.ink400}
                multiline
                maxLength={FEEDBACK_COMMENT_MAX}
                style={[styles.input, { borderColor: c.ink200, color: c.ink900, backgroundColor: c.surface }]}
              />
              <Text style={[CLARITY_HINT, { color: c.ink400 }]}>
                {comment.length}/{FEEDBACK_COMMENT_MAX}
              </Text>
              <Button title={busy ? 'Saving…' : 'Submit feedback'} disabled={busy || comment.trim().length < 8} onPress={save} />
              {feedback && editing ? (
                <Button title="Cancel" variant="secondary" onPress={() => setEditing(false)} />
              ) : null}
            </>
          )}
        </Card>
      )}

      {err ? <Text style={{ color: c.red700 }}>{err}</Text> : null}
      {msg ? <Text style={{ color: c.emerald800 }}>{msg}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stars: { flexDirection: 'row', gap: 4 },
  star: { fontSize: 28 },
  starOn: { color: '#f59e0b' },
  starOff: { color: '#e2e8f0' },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  commentRead: { fontSize: 15, lineHeight: 22 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
});
