"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import {
  ADMIN_ROLES,
  type AdminRole,
  getAdminRoleLabel,
} from "@/lib/admin-roles";

type StatusMessage = {
  tone: "success" | "error";
  text: string;
};

type AdminUserSummary = {
  fullName: string | null;
  id: string;
  isActive: boolean;
  lastLoginLabel: string;
  roles: AdminRole[];
  username: string;
};

type AdminMenuProps = {
  canManageVacancies: boolean;
  canManageUsers: boolean;
  fullName: string | null;
  passwordMessage: StatusMessage | null;
  rolesLabel: string;
  username: string;
  userMessage: StatusMessage | null;
  users: AdminUserSummary[];
};

export function AdminMenu({
  canManageVacancies,
  canManageUsers,
  fullName,
  passwordMessage,
  rolesLabel,
  username,
  userMessage,
  users,
}: AdminMenuProps) {
  const passwordDialogRef = useRef<HTMLDialogElement>(null);
  const profileMenuRef = useRef<HTMLDetailsElement>(null);
  const usersDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (passwordMessage) {
      openDialog(passwordDialogRef.current);
      return;
    }

    if (userMessage && canManageUsers) {
      openDialog(usersDialogRef.current);
    }
  }, [canManageUsers, passwordMessage, userMessage]);

  return (
    <>
      <details className="admin-profile" ref={profileMenuRef}>
        <summary aria-label="Открыть меню профиля">
          <span aria-hidden="true" className="admin-profile-icon" />
        </summary>
        <div className="admin-profile-dropdown">
          <div className="admin-profile-identity">
            <strong>{fullName || username}</strong>
            {fullName ? <span>{username}</span> : null}
            <span>{rolesLabel}</span>
          </div>
          <button
            className="admin-profile-action"
            onClick={() => {
              closeProfileMenu(profileMenuRef.current);
              openDialog(passwordDialogRef.current);
            }}
            type="button"
          >
            Сменить пароль
          </button>
          <form action="/admin/logout" method="post">
            <button className="admin-profile-action" type="submit">
              Выйти
            </button>
          </form>
        </div>
      </details>

      {canManageUsers || canManageVacancies ? (
        <nav className="admin-page-menu" aria-label="Действия администратора">
          {canManageVacancies ? (
            <a className="admin-save admin-menu-link" href="/admin/vacancies">
              Вакансии
            </a>
          ) : null}
          {canManageUsers ? (
            <>
              <button
                className="admin-save"
                onClick={() => openDialog(usersDialogRef.current)}
                type="button"
              >
                Сотрудники
              </button>
              <a
                className="secondary-link"
                href="/admin/logs"
                rel="noopener noreferrer"
                target="_blank"
              >
                Логи изменений
              </a>
            </>
          ) : null}
        </nav>
      ) : null}

      <dialog
        className="admin-modal"
        onClick={(event) => closeFromBackdrop(event)}
        ref={passwordDialogRef}
      >
        <div className="admin-modal-content">
          <button
            aria-label="Закрыть"
            className="modal-close"
            onClick={() => passwordDialogRef.current?.close()}
            type="button"
          >
            ×
          </button>
          <div className="admin-modal-header">
            <p className="eyebrow">Безопасность</p>
            <h2>Сменить пароль</h2>
          </div>
          <form action="/admin/password" className="admin-modal-form" method="post">
            <label className="apply-field">
              <span>Текущий пароль</span>
              <input
                autoComplete="current-password"
                name="currentPassword"
                required
                type="password"
              />
            </label>
            <label className="apply-field">
              <span>Новый пароль</span>
              <input
                autoComplete="new-password"
                minLength={4}
                name="newPassword"
                required
                type="password"
              />
            </label>
            <label className="apply-field">
              <span>Повторите пароль</span>
              <input
                autoComplete="new-password"
                minLength={4}
                name="confirmPassword"
                required
                type="password"
              />
            </label>
            {passwordMessage ? <AdminMessage message={passwordMessage} /> : null}
            <button className="admin-save" type="submit">
              Сменить пароль
            </button>
          </form>
        </div>
      </dialog>

      {canManageUsers ? (
        <dialog
          className="admin-modal admin-modal--wide"
          onClick={(event) => closeFromBackdrop(event)}
          ref={usersDialogRef}
        >
          <div className="admin-modal-content">
            <button
              aria-label="Закрыть"
              className="modal-close"
              onClick={() => usersDialogRef.current?.close()}
              type="button"
            >
              ×
            </button>
            <div className="admin-modal-header">
              <p className="eyebrow">Доступ</p>
              <h2>Создать пользователя</h2>
            </div>
            <form
              action="/admin/users/create"
              className="admin-modal-form admin-user-form"
              method="post"
            >
              <label className="apply-field">
                <span>Логин</span>
                <input
                  autoComplete="username"
                  name="username"
                  pattern="[a-z0-9._-]{3,32}"
                  required
                />
              </label>
              <label className="apply-field">
                <span>ФИО (необязательно)</span>
                <input
                  autoComplete="name"
                  maxLength={200}
                  name="fullName"
                />
              </label>
              <label className="apply-field">
                <span>Пароль</span>
                <input
                  autoComplete="new-password"
                  minLength={4}
                  name="password"
                  required
                  type="password"
                />
              </label>
              <RoleCheckboxes selectedRoles={["MANAGER"]} />
              {userMessage ? <AdminMessage message={userMessage} /> : null}
              <button className="admin-save" type="submit">
                Создать пользователя
              </button>
            </form>

            <div className="admin-users-list">
              <h3>Текущие пользователи</h3>
              {users.map((user) => (
                <form
                  action={`/admin/users/${user.id}/update`}
                  className="admin-user-row admin-user-edit-form"
                  key={user.id}
                  method="post"
                >
                  <div className="admin-user-heading">
                    <div>
                      <strong>{user.fullName || user.username}</strong>
                      {user.fullName ? <span>{user.username}</span> : null}
                    </div>
                    <span>{user.lastLoginLabel}</span>
                  </div>
                  <label className="apply-field">
                    <span>ФИО</span>
                    <input
                      defaultValue={user.fullName ?? ""}
                      maxLength={200}
                      name="fullName"
                    />
                  </label>
                  <RoleCheckboxes
                    idPrefix={user.id}
                    selectedRoles={user.roles}
                  />
                  <label className="admin-checkbox">
                    <input
                      defaultChecked={user.isActive}
                      name="isActive"
                      type="checkbox"
                    />
                    <span>Активен</span>
                  </label>
                  <button className="admin-save" type="submit">
                    Сохранить
                  </button>
                </form>
              ))}
            </div>
          </div>
        </dialog>
      ) : null}
    </>
  );
}

function RoleCheckboxes({
  idPrefix = "new-user",
  selectedRoles,
}: {
  idPrefix?: string;
  selectedRoles: AdminRole[];
}) {
  return (
    <fieldset className="admin-role-fieldset">
      <legend>Роли</legend>
      <div>
        {ADMIN_ROLES.map((role) => (
          <label className="admin-checkbox" key={role}>
            <input
              defaultChecked={selectedRoles.includes(role)}
              id={`${idPrefix}-${role}`}
              name="roles"
              type="checkbox"
              value={role}
            />
            <span>{getAdminRoleLabel(role)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function AdminMessage({ message }: { message: StatusMessage }) {
  return (
    <p className={`form-message form-message--${message.tone}`}>
      {message.text}
    </p>
  );
}

function openDialog(dialog: HTMLDialogElement | null) {
  if (dialog && !dialog.open) {
    dialog.showModal();
  }
}

function closeProfileMenu(menu: HTMLDetailsElement | null) {
  if (menu) {
    menu.open = false;
  }
}

function closeFromBackdrop(event: MouseEvent<HTMLDialogElement>) {
  if (event.target === event.currentTarget) {
    event.currentTarget.close();
  }
}
