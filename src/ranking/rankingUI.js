
import { rankingManager } from './rankingManager.js';
import { LEVEL_TABLE } from '../constants/levels.js';

export class RankingUI {
    constructor(onRegisterSuccess) {
        this.onRegisterSuccess = onRegisterSuccess;
        this.rankingListElement = document.getElementById('ranking-list');
        this.rankingScreen = document.getElementById('screen-ranking');
        this.registerModal = document.getElementById('ranking-register-modal');
        this.registerForm = document.getElementById('ranking-register-form');
        this.closeRegisterBtn = document.getElementById('btn-close-register');
        this.submitRegisterBtn = document.getElementById('btn-submit-ranking');

        this.currentScore = 0;

        this.init();
    }

    init() {
        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        if (this.closeRegisterBtn) {
            this.closeRegisterBtn.addEventListener('click', () => this.hideRegisterModal());
        }

        // Global click handler for delete buttons (since they are dynamic)
        if (this.rankingListElement) {
            this.rankingListElement.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-delete-score')) {
                    const id = e.target.dataset.id;
                    this.handleDelete(id);
                }
            });
        }
    }

    setTranslator(t, getLanguage) {
        this.t = t;
        this.getLanguage = getLanguage;
    }

    async showRanking() {
        if (this.rankingScreen) {
            this.rankingScreen.hidden = false;
            await this.refreshRanking();
        }
    }

    hideRanking() {
        if (this.rankingScreen) {
            this.rankingScreen.hidden = true;
        }
    }

    async refreshRanking() {
        if (!this.rankingListElement) return;

        const t = this.t || ((key) => key);

        this.rankingListElement.innerHTML = `<div class="loading">${t('ranking.loading')}</div>`;
        this.hideMyBest();

        // Fetch more items to increase chance of finding user's rank
        const rankings = await rankingManager.getRankings(50);

        if (rankings.length === 0) {
            this.rankingListElement.innerHTML = `<div class="no-data">${t('ranking.noData')}</div>`;
            return;
        }

        let html = `<table class="ranking-table"><thead><tr><th>${t('ranking.rankHeader')}</th><th>${t('ranking.nicknameHeader')}</th><th>${t('ranking.scoreHeader')}</th><th></th></tr></thead><tbody>`;
        let myBestRankItem = null;
        let myBestRankIndex = -1;

        rankings.forEach((item, index) => {
            const isMine = rankingManager.isMyScore(item.id);
            const rank = index + 1;

            if (isMine) {
                if (!myBestRankItem) {
                    myBestRankItem = item;
                    myBestRankIndex = rank;
                }
            }

            const xLink = item.x_id ? `<a href="https://x.com/${item.x_id}" target="_blank" rel="noopener noreferrer" class="x-link">@${item.x_id}</a>` : '';
            const deleteBtn = isMine ? `<button class="btn-delete-score" data-id="${item.id}">${t('ranking.delete')}</button>` : '';

            html += `
        <tr class="${isMine ? 'my-score' : ''}">
          <td class="rank-cell">${rank}</td>
          <td class="name-cell">
            <div class="name-content">
              <span class="nickname">${this.escapeHtml(item.nickname)}</span>
              ${xLink}
            </div>
          </td>
          <td class="score-cell">${item.score}</td>
          <td class="action-cell">${deleteBtn}</td>
        </tr>
      `;
        });

        html += '</tbody></table>';
        this.rankingListElement.innerHTML = html;

        // Display My Best
        if (myBestRankItem) {
            this.showMyBest(myBestRankIndex, myBestRankItem);
        } else {
            // If not in top 50, check local storage for best score
            // This is a fallback and won't show exact rank if outside fetched range
            this.showMyBestFallback();
        }
    }

    showMyBest(rank, item) {
        const container = document.getElementById('my-best-container');
        if (!container) return;

        document.getElementById('my-best-rank').textContent = rank;
        document.getElementById('my-best-name').textContent = item.nickname;
        document.getElementById('my-best-score').textContent = item.score;

        const levelName = this.getLevelNameByScore(item.score);
        document.getElementById('my-best-level').textContent = levelName;

        container.hidden = false;
    }

    showMyBestFallback() {
        // Try to find best score from local storage history if available
        // Note: This app saves history in 'oshiHistory' in app.js
        // We can try to read it, or just hide the section if not found in ranking
        const container = document.getElementById('my-best-container');
        if (container) container.hidden = true;
    }

    hideMyBest() {
        const container = document.getElementById('my-best-container');
        if (container) container.hidden = true;
    }

    getLevelNameByScore(score) {
        const level = LEVEL_TABLE.find((entry) => score <= entry.max) || LEVEL_TABLE[LEVEL_TABLE.length - 1];
        const lang = this.getLanguage ? this.getLanguage() : 'ja';
        return level.names[lang] || level.names.ja || level.name;
    }

    showRegisterModal(score) {
        this.currentScore = score;
        if (this.registerModal) {
            this.registerModal.hidden = false;
            const scoreDisplay = document.getElementById('register-score-display');
            if (scoreDisplay) scoreDisplay.textContent = score;

            const t = this.t || ((key) => key);
            const nicknameInput = document.getElementById('input-nickname');
            if (nicknameInput) nicknameInput.placeholder = t('ranking.register.nicknamePlaceholder');
            const xIdInput = document.getElementById('input-xid');
            if (xIdInput) xIdInput.placeholder = t('ranking.register.xIdPlaceholder');
        }
    }

    hideRegisterModal() {
        if (this.registerModal) {
            this.registerModal.hidden = true;
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const t = this.t || ((key) => key);
        const nicknameInput = document.getElementById('input-nickname');
        const xIdInput = document.getElementById('input-xid');

        const nickname = nicknameInput ? nicknameInput.value : '';
        const xId = xIdInput ? xIdInput.value : '';

        if (!nickname) {
            alert(t('ranking.register.nicknameRequired'));
            return;
        }

        if (this.submitRegisterBtn) {
            this.submitRegisterBtn.disabled = true;
            this.submitRegisterBtn.textContent = t('ranking.register.submitting');
        }

        try {
            await rankingManager.submitScore(nickname, xId, this.currentScore);
            this.hideRegisterModal();
            alert(t('ranking.register.success'));
            // Reset form
            if (nicknameInput) nicknameInput.value = '';
            if (xIdInput) xIdInput.value = '';

            if (this.onRegisterSuccess) {
                this.onRegisterSuccess();
            }
        } catch (error) {
            console.error(error);
            alert(t('ranking.register.error', { message: error.message || 'Error' }));
        } finally {
            if (this.submitRegisterBtn) {
                this.submitRegisterBtn.disabled = false;
                this.submitRegisterBtn.textContent = t('ranking.register.submit');
            }
        }
    }

    async handleDelete(id) {
        const t = this.t || ((key) => key);
        if (!confirm(t('ranking.delete.confirm'))) return;

        try {
            await rankingManager.deleteScore(id);
            await this.refreshRanking();
        } catch (error) {
            console.error(error);
            alert(t('ranking.delete.error', { message: error.message || 'Error' }));
        }
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, function (m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }
}
