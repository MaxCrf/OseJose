// Attend que le HTML soit chargé pour exécuter le script
document.addEventListener('DOMContentLoaded', () => {

    // --- Classes (Modèles de données) ---

    class Carte {
        constructor(enseigne, rang) {
            this.enseigne = enseigne;
            this.rang = rang;
            this.valeur = this._getValeur();
            this.couleur_rb = this._getCouleurRB();
        }

        _getValeur() {
            if (['Valet', 'Dame', 'Roi'].includes(this.rang)) {
                return { 'Valet': 11, 'Dame': 12, 'Roi': 13 }[this.rang];
            }
            if (this.rang === 'As') {
                return 14;
            }
            return parseInt(this.rang);
        }

        _getCouleurRB() {
            return ['Coeur', 'Carreau'].includes(this.enseigne) ? 'Rouge' : 'Noir';
        }

        toString() {
            return `${this.rang} de ${this.enseigne}`;
        }
    }

    class Paquet {
        constructor() {
            this.cartes = [];
            this._creerPaquet();
            this.melanger();
        }

        _creerPaquet() {
            const enseignes = ['Coeur', 'Carreau', 'Trefle', 'Pique']; 
            const rangs = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Valet', 'Dame', 'Roi', 'As'];
            this.cartes = enseignes.flatMap(e => rangs.map(r => new Carte(e, r)));
        }

        melanger() {
            for (let i = this.cartes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.cartes[i], this.cartes[j]] = [this.cartes[j], this.cartes[i]];
            }
            console.log("--- Le paquet a été mélangé ! ---");
        }

        piocher(nombre = 1) {
            let cartesPiochees = [];
            for (let i = 0; i < nombre; i++) {
                if (this.cartes.length < 12) {
                    console.log("Pas assez de cartes, on remélange le paquet...");
                    this._creerPaquet();
                    this.melanger();
                }
                cartesPiochees.push(this.cartes.pop());
            }
            return cartesPiochees;
        }
    }

    // --- Classe principale du Jeu ---

    class JeuOseJose {
        constructor() {
            // État du jeu
            this.joueurs = [];
            this.indexJoueurActuel = 0;
            this.paquet = new Paquet();
            this.cartesPiocheesCeTour = [];
            this.aOse = false;
            this.pariEnAttente = null;
            this.quantiteEnAttente = 1;
            this.gorgeesEnJeu = 0;
            this.ambianceStarted = false; // NOUVEAU : Pour s'assurer qu'elle ne se lance qu'une fois

            // Pré-chargement des sons
            try {
                this.sndClick = new Audio('sons/click.mp3');
                this.sndWin = new Audio('sons/win.mp3');
                this.sndLose = new Audio('sons/lose.mp3');
                this.sndAmbiance = new Audio('sons/ambiance.mp3');
                this.sndAmbiance.loop = true; 
                
                this.sndClick.onerror = () => console.log("Erreur: Fichier click.mp3 introuvable");
                this.sndWin.onerror = () => console.log("Erreur: Fichier win.mp3 introuvable");
                this.sndLose.onerror = () => console.log("Erreur: Fichier lose.mp3 introuvable");
                this.sndAmbiance.onerror = () => console.log("Erreur: Fichier ambiance.mp3 introuvable");
            } catch (e) {
                console.error("Impossible de charger les sons:", e);
            }

            // Éléments du DOM
            this.setupScreen = document.getElementById('setup-screen');
            this.gameScreen = document.getElementById('game-screen');
            this.numJoueursInput = document.getElementById('num-joueurs');
            this.nomsJoueursContainer = document.getElementById('noms-joueurs-container');
            this.btnCommencer = document.getElementById('btn-commencer');
            this.nomJoueurActuelEl = document.getElementById('nom-joueur-actuel');
            this.compteCartesEl = document.getElementById('compte-cartes');
            this.statutOseEl = document.getElementById('statut-ose');
            this.contexteZoneEl = document.getElementById('contexte-zone');
            this.dernierTirageEl = document.getElementById('dernier-tirage-zone');
            this.messageTexteEl = document.getElementById('message-texte');
            this.btnRejouer = document.getElementById('btn-rejouer');
            this.parisZone = document.getElementById('paris-zone');
            this.btnArreter = document.getElementById('btn-arreter');
            
            // Modals
            this.quantiteModal = document.getElementById('quantite-modal');
            this.joseModal = document.getElementById('jose-modal');

            this.lierEvenementsSetup();
            this.lierEvenementsJeu();
        }

        // --- 1. Phase de Configuration ---
        lierEvenementsSetup() {
            this.numJoueursInput.addEventListener('change', () => this.majNomsInputs());
            this.btnCommencer.addEventListener('click', () => this.commencerPartie());
            this.majNomsInputs();

            // NOUVEAU : Fonction pour démarrer l'ambiance à la 1ère interaction
            const startAmbiance = () => {
                if (!this.ambianceStarted) {
                    this.sndAmbiance?.play().catch(e => console.log("L'autoplay a été bloqué."));
                    this.ambianceStarted = true;
                    // On supprime les écouteurs pour ne pas qu'ils tournent pour rien
                    this.setupScreen.removeEventListener('click', startAmbiance);
                    this.setupScreen.removeEventListener('keydown', startAmbiance);
                }
            };

            // On écoute le premier clic OU la première touche pressée
            this.setupScreen.addEventListener('click', startAmbiance);
            this.setupScreen.addEventListener('keydown', startAmbiance);
        }

        majNomsInputs() {
            const num = parseInt(this.numJoueursInput.value, 10);
            this.nomsJoueursContainer.innerHTML = '';
            for (let i = 0; i < num; i++) {
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = `Nom du Joueur ${i + 1}`;
                input.className = 'nom-joueur-input';
                this.nomsJoueursContainer.appendChild(input);
            }
        }

        commencerPartie() {
            this.joueurs = Array.from(document.querySelectorAll('.nom-joueur-input')).map(input => input.value || input.placeholder);
            if (this.joueurs.length === 0) return;
            this.setupScreen.classList.remove('active');
            this.gameScreen.classList.add('active');
            this.indexJoueurActuel = 0;

            // SUPPRIMÉ : La musique est déjà lancée (ou tentée)
            // this.sndAmbiance?.play().catch(e => console.log("L'autoplay..."));

            this.demarrerTour();
        }

        // --- 2. Phase de Jeu ---
        lierEvenementsJeu() {
            this.parisZone.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-pari') && !e.target.disabled) {
                    this.sndClick?.play().catch(e => console.log("Erreur son clic"));
                    const pari = e.target.dataset.pari;
                    this.gererPari(pari);
                }
            });

            this.btnArreter.addEventListener('click', () => {
                this.sndClick?.play().catch(e => console.log("Erreur son clic"));
                this.passerAuJoueurSuivant();
            });
            this.btnRejouer.addEventListener('click', () => {
                this.sndClick?.play().catch(e => console.log("Erreur son clic"));
                this.demarrerTour();
            });

            this.quantiteModal.addEventListener('click', (e) => {
                this.sndClick?.play().catch(e => console.log("Erreur son clic"));
                if (e.target.classList.contains('btn-quantite')) {
                    this.quantiteEnAttente = parseInt(e.target.dataset.q, 10);
                    this.quantiteModal.classList.add('hidden');
                    
                    if (this.pariEnAttente === 'josé-couleur') {
                        this.pariEnAttente = 'josé'; 
                        this.joseModal.classList.remove('hidden'); 
                    } else {
                        this.resoudrePariFinal(this.pariEnAttente, this.quantiteEnAttente, null);
                    }
                }
                if (e.target.id === 'btn-annuler-quantite') {
                    this.quantiteModal.classList.add('hidden');
                    this.pariEnAttente = null;
                }
            });
            
            this.joseModal.addEventListener('click', (e) => {
                this.sndClick?.play().catch(e => console.log("Erreur son clic"));
                if (e.target.id === 'btn-jose-rouge' || e.target.id === 'btn-jose-noir') {
                    const couleurAnnoncee = (e.target.id === 'btn-jose-rouge') ? 'Rouge' : 'Noir';
                    this.joseModal.classList.add('hidden');
                    this.resoudrePariFinal('josé', 1, couleurAnnoncee);
                }
            });
        }

        demarrerTour() {
            this.cartesPiocheesCeTour = [];
            this.aOse = false;
            this.nomJoueurActuelEl.textContent = `C'est au tour de ${this.joueurs[this.indexJoueurActuel]} !`;
            this.dernierTirageEl.innerHTML = '<h3>Tirage actuel</h3>';
            this.messageTexteEl.textContent = '';
            this.btnRejouer.classList.add('hidden');
            this.parisZone.classList.remove('hidden');
            this.mettreAJourInterface();
        }

        gererPari(pari) {
            if (['rouge', 'noir', 'plus', 'moins', 'intérieur', 'extérieur'].includes(pari)) {
                this.resoudrePariFinal(pari, 1, null);
                return;
            }
            
            if (['purple', 'osé josé', 'josé-couleur'].includes(pari)) {
                this.pariEnAttente = pari;
                if (pari === 'josé-couleur') {
                    this.joseModal.classList.remove('hidden');
                } else {
                    this.quantiteModal.classList.remove('hidden');
                }
            }
        }

        resoudrePariFinal(pari, quantite, extraData) {
            const { succes, groupesDeCartes, estOse } = this._resoudrePari(pari, quantite, extraData);
            
            this._afficherCartesEnRangees(groupesDeCartes, this.dernierTirageEl);
            
            const cartesTirees = groupesDeCartes.flat();
            this.cartesPiocheesCeTour.push(...cartesTirees);

            if (succes) {
                this.sndWin?.play().catch(e => console.log("Erreur son victoire"));
                this._afficherMessage("...RÉUSSI !", true);
                if (estOse) {
                    this.aOse = true;
                }
            } else {
                this.sndLose?.play().catch(e => console.log("Erreur son défaite"));
                const gorgeesLocales = this.cartesPiocheesCeTour.length;
                const gorgeesTotales = this.gorgeesEnJeu + gorgeesLocales;

                this._afficherMessage(`...RATÉ ! ${this.joueurs[this.indexJoueurActuel]} doit boire ${gorgeesTotales} gorgée(s).`, false);
                this.gererPerte();
            }
            
            this.mettreAJourInterface();
        }

        gererPerte() {
            this.parisZone.classList.add('hidden');
            this.btnArreter.classList.add('hidden');
            this.btnRejouer.classList.remove('hidden');

            this.gorgeesEnJeu = 0;
        }

        passerAuJoueurSuivant() {
            this.gorgeesEnJeu += this.cartesPiocheesCeTour.length;
            this.indexJoueurActuel = (this.indexJoueurActuel + 1) % this.joueurs.length;
            this._afficherMessage(`Tour suivant...`, true);
            setTimeout(() => this.demarrerTour(), 1500);
        }

        // --- Logique de Résolution (Logique Totale + Affichage Trié) ---
        
        _resoudrePari(pari, quantite, extraData) {
            let groupesDeCartes = [];
            let succes = false;
            let estOse = false;

            try {
                // --- Paris simples ---
                if (pari === 'rouge' || pari === 'noir') {
                    const carte = this.paquet.piocher(1)[0];
                    succes = (pari === 'rouge') ? (carte.couleur_rb === 'Rouge') : (carte.couleur_rb === 'Noir');
                    groupesDeCartes = [[carte]];
                }
                // --- Paris de contexte ---
                else if (pari === 'plus' || pari === 'moins') {
                    const prec = this.cartesPiocheesCeTour[this.cartesPiocheesCeTour.length - 1];
                    const carte = this.paquet.piocher(1)[0];
                    succes = (pari === 'plus') ? (carte.valeur > prec.valeur) : (carte.valeur < prec.valeur);
                    groupesDeCartes = [[carte]];
                }
                else if (pari === 'intérieur' || pari === 'extérieur') {
                    const a = this.cartesPiocheesCeTour[this.cartesPiocheesCeTour.length - 1];
                    const b = this.cartesPiocheesCeTour[this.cartesPiocheesCeTour.length - 2];
                    const low = Math.min(a.valeur, b.valeur);
                    const high = Math.max(a.valeur, b.valeur);
                    const carte = this.paquet.piocher(1)[0];
                    if (pari === 'intérieur') { succes = carte.valeur > low && carte.valeur < high; }
                    else { succes = carte.valeur < low || carte.valeur > high; }
                    groupesDeCartes = [[carte]];
                }
                
                // --- Pari "José" (cas spécial) ---
                else if (pari === 'josé') {
                    estOse = true;
                    const cartes = this.paquet.piocher(3);
                    groupesDeCartes = [[cartes[0], cartes[1]], [cartes[2]]]; 
                    const succes_purple = cartes[0].couleur_rb !== cartes[1].couleur_rb;
                    const succes_couleur = cartes[2].couleur_rb === extraData;
                    succes = succes_purple && succes_couleur;
                }

                // --- Pari "Purple" (Logique Totale + Affichage en Paires) ---
                else if (pari === 'purple') {
                    estOse = true;
                    const cartes = this.paquet.piocher(quantite * 2);
                    const totalRouges = cartes.filter(c => c.couleur_rb === 'Rouge').length;
                    
                    succes = (totalRouges === quantite); 

                    for (let i = 0; i < quantite; i++) {
                        groupesDeCartes.push(cartes.slice(i * 2, (i * 2) + 2));
                    }
                }
                
                // --- Pari "Osé José" (Logique Totale + Affichage Trié) ---
                else if (pari === 'osé josé') {
                    estOse = true;
                    const cartes = this.paquet.piocher(quantite * 4);
                    const totalRouges = cartes.filter(c => c.couleur_rb === 'Rouge').length;

                    if (quantite === 1) { 
                        succes = totalRouges === 1 || totalRouges === 3;
                    } else if (quantite === 2) {
                        succes = totalRouges === 2 || totalRouges === 4 || totalRouges === 6;
                    } else if (quantite === 3) {
                        succes = totalRouges === 3 || totalRouges === 5 || totalRouges === 7 || totalRouges === 9;
                    }

                    let cartesRouges = cartes.filter(c => c.couleur_rb === 'Rouge');
                    let cartesNoires = cartes.filter(c => c.couleur_rb === 'Noir');
                    
                    for (let i = 0; i < quantite; i++) {
                        let groupeActuel = [];
                        if (cartesRouges.length >= 3 && cartesNoires.length >= 1) {
                            groupeActuel = [...cartesRouges.splice(0, 3), cartesNoires.pop()];
                        }
                        else if (cartesRouges.length >= 1 && cartesNoires.length >= 3) {
                            groupeActuel = [cartesRouges.pop(), ...cartesNoires.splice(0, 3)];
                        }
                        else {
                            let cartesRestantes = [...cartesRouges, ...cartesNoires];
                            groupeActuel = cartesRestantes.splice(0, 4);
                            cartesRouges = cartesRestantes.filter(c => c.couleur_rb === 'Rouge');
                            cartesNoires = cartesRestantes.filter(c => c.couleur_rb === 'Noir');
                        }
                        groupesDeCartes.push(groupeActuel);
                    }
                }

            } catch (e) {
                console.error("Erreur lors de la résolution du pari:", e);
                return { succes: false, groupesDeCartes: [], estOse: false };
            }
            return { succes, groupesDeCartes, estOse };
        }

        // --- Fonctions d'aide pour l'Interface ---

        mettreAJourInterface() {
            const numCartes = this.cartesPiocheesCeTour.length;
            this.compteCartesEl.textContent = `Cartes ce tour : ${numCartes} (Total en jeu : ${this.gorgeesEnJeu})`;
            
            this.statutOseEl.classList.toggle('hidden', !this.aOse);

            const btnPlus = document.querySelector("[data-pari='plus']");
            const btnMoins = document.querySelector("[data-pari='moins']");
            const btnInterieur = document.querySelector("[data-pari='intérieur']");
            const btnExterieur = document.querySelector("[data-pari='extérieur']");

            btnPlus.disabled = numCartes < 1;
            btnMoins.disabled = numCartes < 1;
            btnInterieur.disabled = numCartes < 2;
            btnExterieur.disabled = numCartes < 2;
            
            this._afficherCartesDeContexte();

            const peutArreter = numCartes >= 4 && this.aOse;
            // CORRIGÉ : 'peuxArreter' est devenu 'peutArreter'
            this.btnArreter.classList.toggle('hidden', !peutArreter);
        }
        
        _afficherCartesEnRangees(groupesDeCartes, elementCible) {
            elementCible.innerHTML = '<h3>Tirage actuel</h3>';
            
            groupesDeCartes.forEach(groupe => {
                const rangeeEl = document.createElement('div');
                rangeeEl.className = 'carte-rangee';
                groupe.forEach(carte => {
                    rangeeEl.appendChild(this._creerElementCarte(carte));
                });
                elementCible.appendChild(rangeeEl);
            });
        }
        
        _afficherCartesDeContexte() {
            this.contexteZoneEl.innerHTML = '<h3>Deux dernières cartes tirées</h3>';
            const numCartes = this.cartesPiocheesCeTour.length;

            if (numCartes === 0) {
                this.contexteZoneEl.innerHTML += '<p style="opacity: 0.5;">(Aucune carte piochée)</p>';
                return;
            }
            
            const cartesContexte = (numCartes >= 2) 
                ? this.cartesPiocheesCeTour.slice(-2)
                : this.cartesPiocheesCeTour.slice(-1);

            cartesContexte.forEach(carte => {
                this.contexteZoneEl.appendChild(this._creerElementCarte(carte, true)); // 'true' pour petite
            });
        }
        
        _creerElementCarte(carte, estPetite = false) {
            const carteEl = document.createElement('div');
            carteEl.className = `carte ${carte.couleur_rb === 'Rouge' ? 'rouge' : 'noir'}`;
            
            if (estPetite) {
                carteEl.classList.add('petite');
            }

            const rangEl = document.createElement('strong');
            rangEl.textContent = carte.rang;
            
            const enseigneEl = document.createElement('span');
            enseigneEl.textContent = carte.enseigne; 

            carteEl.appendChild(rangEl);
            carteEl.appendChild(enseigneEl);
            return carteEl;
        }

        _afficherMessage(texte, succes) {
            this.messageTexteEl.textContent = texte;
            this.messageTexteEl.className = succes ? 'succes' : 'echec';
        }
    }

    // --- Lancement du jeu ---
    const jeu = new JeuOseJose();

}); // <-- L'accolade en trop est bien supprimée.
