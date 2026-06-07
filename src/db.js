import { supabase } from './supabase';

// ── HASH SIMPLES (sem biblioteca) ────────────────────────────────────────────
export async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── PERFIS ───────────────────────────────────────────────────────────────────
export async function getAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, c1, c2, c3')   // nunca retorna password_hash
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function registerProfile(name, password, c1, c2, c3) {
  // Verifica se já existe
  const { data: existing } = await supabase
    .from('profiles')
    .select('name')
    .eq('name', name.trim())
    .single();
  if (existing) throw new Error('Nome já cadastrado. Escolha outro ou faça login.');

  const password_hash = await hashPassword(password);
  const { data, error } = await supabase
    .from('profiles')
    .insert({ name: name.trim(), c1, c2, c3, password_hash })
    .select('name, c1, c2, c3')
    .single();
  if (error) throw error;
  return data;
}

export async function loginProfile(name, password) {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, c1, c2, c3, password_hash')
    .eq('name', name.trim())
    .single();
  if (error || !data) throw new Error('Usuário não encontrado.');

  const hash = await hashPassword(password);
  if (hash !== data.password_hash) throw new Error('Senha incorreta.');

  // retorna sem o hash
  const { password_hash: _, ...profile } = data;
  return profile;
}

export async function updateColors(name, c1, c2, c3) {
  const { error } = await supabase
    .from('profiles')
    .update({ c1, c2, c3 })
    .eq('name', name.trim());
  if (error) throw error;
}

// ── PROGRESSO ────────────────────────────────────────────────────────────────
export async function loadProgress(profileName) {
  const { data, error } = await supabase
    .from('album_progress')
    .select('fig_key, status')
    .eq('profile_name', profileName.trim());
  if (error) throw error;
  const map = {};
  (data || []).forEach(row => { map[row.fig_key] = row.status; });
  return map;
}

export async function saveProgress(profileName, figKey, status) {
  const { error } = await supabase
    .from('album_progress')
    .upsert(
      { profile_name: profileName.trim(), fig_key: figKey, status, updated_at: new Date().toISOString() },
      { onConflict: 'profile_name,fig_key' }
    );
  if (error) throw error;
}
