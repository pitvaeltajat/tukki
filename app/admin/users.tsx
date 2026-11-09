'use client';

import { useActionState } from 'react';
import { changeUserRole, type AdminState } from './actions';

type User = { id: string; name: string | null; email: string; role: 'ADMIN' | 'USER' };

export function AdminUsers({ users }: { users: User[] }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(changeUserRole, {});

  return (
    <section className="card admin-block">
      <div className="section-head">
        <h2>Ylläpitäjät</h2>
        <span className="label">{users.filter((user) => user.role === 'ADMIN').length} ylläpitäjää</span>
      </div>
      <p className="label">
        Kaikki Tukkiin kirjautuneet käyttäjät näkyvät tässä. Ylläpitäjä voi antaa tai poistaa ylläpitäjäoikeuden.
      </p>
      <table>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.name || user.email}</strong>
                {user.name && (
                  <>
                    <br />
                    <span className="label">{user.email}</span>
                  </>
                )}
              </td>
              <td>{user.role === 'ADMIN' ? 'Ylläpitäjä' : 'Käyttäjä'}</td>
              <td className="right">
                <form action={formAction}>
                  <button className="link-button" name="userId" value={user.id} disabled={pending}>
                    {user.role === 'ADMIN' ? 'Alenna käyttäjäksi' : 'Tee ylläpitäjäksi'}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {state.error && (
        <p className="notice" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="label" role="status">
          {state.ok}
        </p>
      )}
    </section>
  );
}
